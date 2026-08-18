/**
 * Bill service — manage bills for table sessions.
 */
import { supabase } from './supabase';
import type { Bill, Order } from 'src/types/database';

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
export async function fetchSessionOrdersForBill(tableSessionId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('table_session_id', tableSessionId)
    .order('queue_number');

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}
