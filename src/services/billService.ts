/**
 * Bill service — manage bills for table sessions.
 */
import { supabase } from './supabase';
import type { Bill, OrderWithItems } from 'src/types/database';

/**
 * Get or create a bill for a table session.
 * Bill is auto-created with PENDING status if it doesn't exist.
 */
export async function getOrCreateBill(tableSessionId: string): Promise<Bill> {
  // Check for existing bill
  const { data: existing } = await supabase
    .from('bills')
    .select('*')
    .eq('table_session_id', tableSessionId)
    .maybeSingle();

  if (existing) return existing as Bill;

  // Calculate total from served/prepared orders in this session
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('table_session_id', tableSessionId);

  const totalAmount = (orders ?? []).reduce(
    (sum: number, o: { total_amount: number }) => sum + o.total_amount,
    0,
  );

  const { data: bill, error } = await supabase
    .from('bills')
    .insert({
      table_session_id: tableSessionId,
      total_amount: totalAmount,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return bill as Bill;
}

/**
 * Mark a bill as paid (Owner action).
 */
export async function markBillPaid(billId: string): Promise<Bill> {
  const { data, error } = await supabase
    .from('bills')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
    })
    .eq('id', billId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Bill;
}

/**
 * Recalculate bill total from all orders in the session.
 */
export async function recalculateBillTotal(billId: string, tableSessionId: string): Promise<Bill> {
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('table_session_id', tableSessionId);

  const totalAmount = (orders ?? []).reduce(
    (sum: number, o: { total_amount: number }) => sum + o.total_amount,
    0,
  );

  const { data, error } = await supabase
    .from('bills')
    .update({ total_amount: totalAmount })
    .eq('id', billId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Bill;
}

/**
 * Fetch session orders for bill display.
 */
export async function fetchSessionOrdersForBill(tableSessionId: string): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      items:order_items (
        *,
        options:order_item_options (*)
      )
    `,
    )
    .eq('table_session_id', tableSessionId)
    .order('queue_number');

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderWithItems[];
}

/**
 * Quick add an item (such as canned drink or bottled water) directly to the table session by owner.
 */
export async function ownerAddQuickItem(
  tableSessionId: string,
  itemName: string,
  price: number,
  quantity: number,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('owner_add_quick_item', {
    p_table_session_id: tableSessionId,
    p_item_name: itemName,
    p_price: price,
    p_quantity: quantity,
  });

  if (!rpcError) return;

  // Fallback if RPC is not yet applied in DB:
  const subtotal = price * quantity;

  // 1. Get next queue number from today's existing orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: latestOrder } = await supabase
    .from('orders')
    .select('queue_number')
    .gte('created_at', todayStart.toISOString())
    .order('queue_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextQueueNum = (latestOrder?.queue_number ?? 0) + 1;

  // Find or create guest_session_id for the table session
  const { data: existingGuestSession } = await supabase
    .from('guest_sessions')
    .select('id')
    .eq('table_session_id', tableSessionId)
    .limit(1)
    .maybeSingle();

  let guestSessionId = existingGuestSession?.id;

  if (!guestSessionId) {
    const { data: newGuestSession } = await supabase
      .from('guest_sessions')
      .insert({
        table_session_id: tableSessionId,
        session_token: `owner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      })
      .select('id')
      .maybeSingle();

    guestSessionId = newGuestSession?.id;
  }

  // 2. Create order with SERVED status
  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      table_session_id: tableSessionId,
      guest_session_id: guestSessionId,
      queue_number: nextQueueNum,
      status: 'SERVED',
      total_amount: subtotal,
    })
    .select('id')
    .single();

  if (orderErr) throw new Error(orderErr.message);

  // 3. Find any menu item ID or placeholder
  const { data: sampleMenuItem } = await supabase
    .from('menu_items')
    .select('id')
    .limit(1)
    .maybeSingle();

  // 4. Insert order item
  const { error: itemErr } = await supabase.from('order_items').insert({
    order_id: newOrder.id,
    menu_item_id: sampleMenuItem?.id,
    snapshot_name: itemName,
    snapshot_base_price: price,
    snapshot_description: 'เพิ่มโดยร้านค้า (Quick Add)',
    quantity,
    special_instruction: null,
    subtotal,
  });

  if (itemErr) throw new Error(itemErr.message);

  // 5. Recalculate bill
  const { data: sessionOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('table_session_id', tableSessionId);

  const newTotal = (sessionOrders ?? []).reduce(
    (sum: number, o: { total_amount: number }) => sum + o.total_amount,
    0,
  );

  await supabase.from('bills').upsert(
    {
      table_session_id: tableSessionId,
      total_amount: newTotal,
      status: 'PENDING',
    },
    { onConflict: 'table_session_id' },
  );
}

/**
 * Fetch bill with full details (table session, table name, orders, items, and options) by bill ID.
 */
export async function fetchBillWithDetails(billId: string): Promise<{
  bill: Bill;
  tableName: string;
  orders: OrderWithItems[];
} | null> {
  const { data: billData, error: billErr } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .single();

  if (billErr || !billData) return null;

  const [{ data: sessionData }, { data: ordersData }] = await Promise.all([
    supabase
      .from('table_sessions')
      .select('id, table:tables(name)')
      .eq('id', billData.table_session_id)
      .maybeSingle(),
    supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items (
          *,
          options:order_item_options (*)
        )
      `,
      )
      .eq('table_session_id', billData.table_session_id)
      .order('queue_number'),
  ]);

  const tableName =
    (sessionData as unknown as { table?: { name?: string } })?.table?.name ?? 'ไม่ระบุโต๊ะ';

  return {
    bill: billData as Bill,
    tableName,
    orders: (ordersData ?? []) as OrderWithItems[],
  };
}

/**
 * Update an order item's base price and subtotal by owner (e.g. for custom options in comments).
 */
export async function ownerUpdateOrderItemPrice(
  orderItemId: string,
  newBasePrice: number,
  newSubtotal?: number,
  specialInstruction?: string,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('owner_update_order_item_price', {
    p_order_item_id: orderItemId,
    p_new_base_price: newBasePrice,
    p_new_subtotal: newSubtotal ?? null,
    p_special_instruction: specialInstruction ?? null,
  });

  if (!rpcError) return;

  // Fallback if RPC is not yet applied in DB:
  // 1. Fetch order item and options
  const { data: itemData, error: fetchErr } = await supabase
    .from('order_items')
    .select('*, options:order_item_options(*), order:orders(*)')
    .eq('id', orderItemId)
    .single();

  if (fetchErr || !itemData) {
    throw new Error(fetchErr?.message || 'ไม่พบรายการอาหาร');
  }

  const options = (itemData.options ?? []) as { snapshot_price_adjustment: number }[];
  const optionsSubtotal = options.reduce(
    (sum, opt) => sum + (opt.snapshot_price_adjustment || 0),
    0,
  );
  const quantity = itemData.quantity || 1;
  const calculatedSubtotal =
    newSubtotal !== undefined && newSubtotal !== null && newSubtotal >= 0
      ? newSubtotal
      : (newBasePrice + optionsSubtotal) * quantity;

  // 2. Update order item
  const updatePayload: Record<string, unknown> = {
    snapshot_base_price: newBasePrice,
    subtotal: calculatedSubtotal,
    updated_at: new Date().toISOString(),
  };
  if (specialInstruction !== undefined) {
    updatePayload.special_instruction = specialInstruction;
  }

  const { error: itemUpdateErr } = await supabase
    .from('order_items')
    .update(updatePayload)
    .eq('id', orderItemId);

  if (itemUpdateErr) throw new Error(itemUpdateErr.message);

  // 3. Recalculate order total
  const orderId = itemData.order_id;
  const { data: allOrderItems } = await supabase
    .from('order_items')
    .select('subtotal')
    .eq('order_id', orderId);

  const newOrderTotal = (allOrderItems ?? []).reduce(
    (sum: number, it: { subtotal: number }) => sum + it.subtotal,
    0,
  );

  await supabase
    .from('orders')
    .update({ total_amount: newOrderTotal, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  // 4. Recalculate session bill if session exists
  const tableSessionId = itemData.order?.table_session_id;
  if (tableSessionId) {
    const { data: allSessionOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('table_session_id', tableSessionId);

    const newBillTotal = (allSessionOrders ?? []).reduce(
      (sum: number, o: { total_amount: number }) => sum + o.total_amount,
      0,
    );

    await supabase.from('bills').upsert(
      {
        table_session_id: tableSessionId,
        total_amount: newBillTotal,
        status: 'PENDING',
      },
      { onConflict: 'table_session_id' },
    );
  }
}
