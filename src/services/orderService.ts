/**
 * Order service — create, edit, and manage orders.
 */
import { supabase } from './supabase';
import type { Order, OrderWithItems } from 'src/types/database';
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
  const { data, error } = await supabase.rpc('create_order', {
    p_table_session_id: payload.table_session_id,
    p_guest_session_token: payload.guest_session_token,
    p_items: payload.items,
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
  guestSessionId?: string,
): Promise<OrderWithItems[]> {
  let query = supabase
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

  if (guestSessionId) {
    query = query.eq('guest_session_id', guestSessionId);
  }

  const { data, error } = await query;
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
export async function fetchOrder(orderId: string): Promise<OrderWithItems | null> {
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
    .eq('id', orderId)
    .single();

  if (error) return null;
  return data as OrderWithItems;
}

export interface ActiveKitchenOrder {
  id: string;
  queue_number: number;
  status: OrderStatus;
  created_at: string;
}

export interface QueuePositionResult {
  queuesAhead: number;
  queuePosition: number;
  totalActive: number;
  statusText: string;
  isCurrentOrNext: boolean;
}

/**
 * Fetch all unserved orders in the kitchen (for customer queue calculation).
 */
export async function fetchActiveKitchenOrders(): Promise<ActiveKitchenOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, queue_number, status, created_at')
    .neq('status', 'SERVED')
    .order('created_at', { ascending: true })
    .order('queue_number', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Calculate queue position and queues ahead for a customer order.
 */
export function calculateQueuePosition(
  targetQueueNumber: number,
  targetStatus: OrderStatus,
  activeKitchenOrders: ActiveKitchenOrder[],
  targetCreatedAt?: string,
): QueuePositionResult {
  if (targetStatus === OrderStatus.SERVED) {
    return {
      queuesAhead: 0,
      queuePosition: 0,
      totalActive: activeKitchenOrders.length,
      statusText: 'เสิร์ฟอาหารเรียบร้อยแล้ว',
      isCurrentOrNext: false,
    };
  }

  if (targetStatus === OrderStatus.PREPARED) {
    return {
      queuesAhead: 0,
      queuePosition: 1,
      totalActive: activeKitchenOrders.length,
      statusText: 'ปรุงเสร็จแล้ว กำลังนำไปเสิร์ฟ',
      isCurrentOrNext: true,
    };
  }

  const ordersAhead = activeKitchenOrders.filter((o) => {
    if (o.status === OrderStatus.SERVED) return false;
    if (targetCreatedAt && o.created_at) {
      return new Date(o.created_at).getTime() < new Date(targetCreatedAt).getTime();
    }
    return o.queue_number < targetQueueNumber;
  });
  const queuesAhead = ordersAhead.length;
  const queuePosition = queuesAhead + 1;

  let statusText: string;
  if (queuesAhead === 0) {
    if (targetStatus === OrderStatus.PREPARING) {
      statusText = 'กำลังปรุงอาหาร (คิวปัจจุบัน)';
    } else {
      statusText = 'เป็นคิวถัดไป ครัวกำลังจะเริ่มทำ';
    }
  } else {
    statusText = `รออีก ${queuesAhead} คิวก่อนหน้า`;
  }

  return {
    queuesAhead,
    queuePosition,
    totalActive: activeKitchenOrders.length,
    statusText,
    isCurrentOrNext: queuesAhead === 0,
  };
}

export interface FetchManageOrdersFilter {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: OrderStatus | 'ALL' | undefined;
  tableId?: string | undefined;
}

/**
 * Fetch orders for owner Order Management page with flexible filters.
 */
export async function fetchManageOrders(
  filters: FetchManageOrdersFilter = {},
): Promise<OrderWithItems[]> {
  let query = supabase
    .from('orders')
    .select(
      `
      *,
      table_session:table_sessions (
        id,
        status,
        customer_name,
        created_at,
        closed_at,
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
    .order('created_at', { ascending: false });

  if (filters.dateFrom) {
    const parts = filters.dateFrom.split('-');
    if (parts.length === 3) {
      const fromDate = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        0,
        0,
        0,
        0,
      );
      query = query.gte('created_at', fromDate.toISOString());
    }
  }

  if (filters.dateTo) {
    const parts = filters.dateTo.split('-');
    if (parts.length === 3) {
      const toDate = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        23,
        59,
        59,
        999,
      );
      query = query.lte('created_at', toDate.toISOString());
    }
  }

  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let orders = (data ?? []) as OrderWithItems[];

  if (filters.tableId && filters.tableId !== 'ALL') {
    orders = orders.filter((o) => o.table_session?.table?.id === filters.tableId);
  }

  return orders;
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
