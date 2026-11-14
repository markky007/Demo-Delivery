/**
 * Order service — create, edit, and manage orders.
 */
import { supabase } from './supabase';
import type { Order, OrderWithItems, OrderHistory } from 'src/types/database';
import type {
  CreateOrderPayload,
  UpdateOrderPayload,
  CreateOrderItemPayload,
} from 'src/types/cart';
import { OrderStatus } from 'src/types/enums';

/**
 * Create a new order via server-side RPC.
 * The RPC validates availability, prices, options, and assigns queue_number.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data, error } = await supabase.rpc('create_order_verified', {
    p_table_session_id: payload.table_session_id,
    p_guest_session_token: payload.guest_session_token,
    p_items: payload.items,
    p_public_token: payload.public_token,
  });

  if (error) throw new Error(error.message);
  return data as Order;
}

/**
 * Update an existing order via server-side RPC.
 * Only allowed for QUEUED/PREPARING orders.
 */
export async function updateOrder(payload: UpdateOrderPayload): Promise<Order> {
  const { data, error } = await supabase.rpc('update_order', {
    p_order_id: payload.order_id,
    p_guest_session_token: payload.guest_session_token,
    p_items: payload.items,
  });

  if (error) throw new Error(error.message);
  return data as Order;
}

/**
 * Update an existing order directly from kitchen / owner (without guest session token).
 * Allows modifying quantities, options, and items freely in Focus Mode.
 */
export async function kitchenUpdateOrder(
  orderId: string,
  items: CreateOrderItemPayload[],
): Promise<Order> {
  const { data, error } = await supabase.rpc('kitchen_update_order', {
    p_order_id: orderId,
    p_items: items,
  });

  if (error) throw new Error(error.message);
  return data as Order;
}

/**
 * Fetch revision history of an order (before edits).
 */
export async function fetchOrderHistory(
  orderId: string,
  guestToken?: string,
): Promise<OrderHistory[]> {
  if (guestToken) {
    const { data, error } = await supabase.rpc('get_order_history_for_guest', {
      p_order_id: orderId,
      p_guest_session_token: guestToken,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderHistory[];
  }

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_history', {
    p_order_id: orderId,
  });

  if (!rpcError && rpcData) {
    return rpcData as OrderHistory[];
  }

  // Fallback to table query
  const { data, error } = await supabase
    .from('order_histories')
    .select('*')
    .eq('order_id', orderId)
    .order('revision', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderHistory[];
}

/**
 * Advance an order's status (Owner action).
 */
export async function advanceOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
  const { data, error } = await supabase.rpc('advance_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
  });

  if (error) throw new Error(error.message);
  return data as Order;
}

/**
 * Fetch orders for a table session (customer view).
 */
export async function fetchSessionOrders(
  tableSessionId: string,
  guestToken: string,
): Promise<OrderWithItems[]> {
  const { data, error } = await supabase.rpc('customer_fetch_orders', {
    p_session_id: tableSessionId,
    p_guest_token: guestToken,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as OrderWithItems[];
}

/**
 * Fetch today's orders for the owner queue.
 */
export async function fetchTodayOrders(): Promise<OrderWithItems[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      table_session:table_sessions (
        id,
        customer_name,
        table:tables (
          id,
          name
        )
      ),
      items:order_items (
        *,
        options:order_item_options (*)
      )
    `,
    )
    .gte('created_at', todayStart.toISOString())
    .order('queue_number');

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderWithItems[];
}

/**
 * Fetch a single order with items.
 */
export async function fetchOrder(
  orderId: string,
  guestToken: string,
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase.rpc('customer_fetch_order', {
    p_order_id: orderId,
    p_guest_token: guestToken,
  });
  if (error) throw new Error(error.message);
  return (data as OrderWithItems | null) ?? null;
}

export interface CustomerQueueSnapshot {
  totalActive: number;
  positions: Record<string, number>;
}

export async function fetchCustomerQueuePositions(
  tableSessionId: string,
  guestToken: string,
): Promise<CustomerQueueSnapshot> {
  const { data, error } = await supabase.rpc('customer_queue_positions', {
    p_session_id: tableSessionId,
    p_guest_token: guestToken,
  });
  if (error) throw new Error(error.message);
  return (data ?? { totalActive: 0, positions: {} }) as CustomerQueueSnapshot;
}

export interface QueuePositionResult {
  queuesAhead: number;
  queuePosition: number;
  totalActive: number;
  statusText: string;
  isCurrentOrNext: boolean;
}

/** Build the customer-facing status from the database's queue count. */
export function calculateQueuePosition(
  orderId: string,
  targetStatus: OrderStatus,
  snapshot: CustomerQueueSnapshot,
): QueuePositionResult {
  if (targetStatus === OrderStatus.SERVED) {
    return {
      queuesAhead: 0,
      queuePosition: 0,
      totalActive: snapshot.totalActive,
      statusText: 'เสิร์ฟอาหารเรียบร้อยแล้ว',
      isCurrentOrNext: false,
    };
  }

  if (targetStatus === OrderStatus.PREPARED) {
    return {
      queuesAhead: 0,
      queuePosition: 1,
      totalActive: snapshot.totalActive,
      statusText: 'ปรุงเสร็จแล้ว กำลังนำไปเสิร์ฟ',
      isCurrentOrNext: true,
    };
  }

  const queuesAhead = snapshot.positions[orderId] ?? 0;
  const queuePosition = queuesAhead + 1;
  const statusText =
    queuesAhead === 0
      ? targetStatus === OrderStatus.PREPARING
        ? 'กำลังปรุงอาหาร (คิวปัจจุบัน)'
        : 'เป็นคิวถัดไป ครัวกำลังจะเริ่มทำ'
      : `รออีก ${queuesAhead} คิวก่อนหน้า`;

  return {
    queuesAhead,
    queuePosition,
    totalActive: snapshot.totalActive,
    statusText,
    isCurrentOrNext: queuesAhead === 0,
  };
}

export interface FetchManageOrdersFilter {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: OrderStatus | 'ALL' | undefined;
  tableFilter?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface ManageOrdersPage {
  orders: OrderWithItems[];
  total: number;
  filteredRevenue: number;
  metrics: Record<string, number>;
}

export async function fetchManageOrders(
  filters: FetchManageOrdersFilter = {},
): Promise<ManageOrdersPage> {
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).toISOString() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).toISOString() : null;
  const { data, error } = await supabase.rpc('owner_list_orders', {
    p_start: from,
    p_end: to,
    p_status: filters.status ?? 'ALL',
    p_table_filter: filters.tableFilter ?? 'ALL',
    p_search: filters.search?.trim() ?? '',
    p_sort: filters.sort ?? 'CREATED_DESC',
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 30,
  });
  if (error) throw new Error(error.message);
  return data as ManageOrdersPage;
}

export interface DeleteOrderResult {
  success: boolean;
  deleted_order_id?: string;
  queue_number?: number;
  table_session_id?: string;
  table_id?: string;
  table_name?: string;
  customer_name?: string;
}

/**
 * Delete an order and completely cascade-purge its session, bills, guest sessions, and items.
 * Frees up table immediately back to AVAILABLE.
 */
export async function deleteOrderAndSession(orderId: string): Promise<DeleteOrderResult> {
  // 1. Try DB RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_order_and_session', {
    p_order_id: orderId,
  });

  if (!rpcError && rpcData) {
    return rpcData as DeleteOrderResult;
  }

  // 2. Client-side fallback if RPC is not yet executed in database
  // Fetch order to get table_session_id
  const { data: order, error: orderFetchErr } = await supabase
    .from('orders')
    .select('id, queue_number, table_session_id')
    .eq('id', orderId)
    .single();

  if (orderFetchErr || !order) {
    throw new Error(orderFetchErr?.message ?? 'ไม่พบข้อมูลออเดอร์');
  }

  const sessionId = order.table_session_id;

  // Delete table_session (cascades to orders, bills, guest_sessions, order_items)
  const { error: sessionDelErr } = await supabase
    .from('table_sessions')
    .delete()
    .eq('id', sessionId);

  if (sessionDelErr) {
    // If cascade on table_sessions failed, try deleting order directly
    const { error: directOrderDelErr } = await supabase.from('orders').delete().eq('id', orderId);

    if (directOrderDelErr) {
      throw new Error(directOrderDelErr.message);
    }
  }

  return {
    success: true,
    deleted_order_id: orderId,
    queue_number: order.queue_number,
    table_session_id: sessionId,
  };
}

/**
 * Set completion status for specific order items (Kitchen checklist sync).
 * Updates order_items.is_completed and completed_at.
 */
export async function setOrderItemsCompleted(
  itemIds: string[],
  isCompleted: boolean,
): Promise<void> {
  if (!itemIds || itemIds.length === 0) return;

  // Try RPC first for atomic update with security definer
  const { error: rpcError } = await supabase.rpc('set_order_items_completed', {
    p_item_ids: itemIds,
    p_is_completed: isCompleted,
  });

  if (!rpcError) return;

  // Graceful fallback to direct table update if RPC is not yet applied
  const { error: tableError } = await supabase
    .from('order_items')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .in('id', itemIds);

  if (tableError) {
    console.error('Failed to update order item completed status:', tableError);
    throw new Error(tableError.message);
  }
}
