/**
 * Session service — manages table sessions and guest sessions.
 */
import { supabase } from './supabase';
import { GUEST_TOKEN_KEY } from 'src/utils/constants';
import { SessionStatus } from 'src/types/enums';
import type { TableSession, GuestSession } from 'src/types/database';

/**
 * Get or create a guest session token from localStorage.
 */
export function getOrCreateGuestToken(): string {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Create a new distinct takeaway table session with customer name.
 */
export async function createTakeawaySession(
  tableId: string,
  guestToken: string,
  customerName: string,
): Promise<{ tableSession: TableSession; guestSession: GuestSession }> {
  // 1. Create new takeaway session with customer name
  const { data: newSession, error: sessionErr } = await supabase
    .from('table_sessions')
    .insert({
      table_id: tableId,
      customer_name: customerName.trim(),
      status: SessionStatus.ACTIVE,
    })
    .select()
    .single();

  if (sessionErr || !newSession) {
    throw new Error(sessionErr?.message ?? 'Failed to create takeaway session');
  }

  const tableSession = newSession as TableSession;

  // 2. Create guest session linked to this takeaway session
  const { data: newGuest, error: guestErr } = await supabase
    .from('guest_sessions')
    .insert({
      table_session_id: tableSession.id,
      session_token: guestToken,
    })
    .select()
    .single();

  if (guestErr || !newGuest) {
    throw new Error(guestErr?.message ?? 'Failed to create guest session');
  }

  const guestSession = newGuest as GuestSession;

  return { tableSession, guestSession };
}

/**
 * Check if the guest already has an active takeaway session in progress.
 */
export async function getActiveTakeawaySessionForGuest(
  tableId: string,
  guestToken: string,
): Promise<{ tableSession: TableSession; guestSession: GuestSession } | null> {
  const { data: guestSessions } = await supabase
    .from('guest_sessions')
    .select('*, table_session:table_sessions(*)')
    .eq('session_token', guestToken)
    .order('created_at', { ascending: false });

  if (!guestSessions || guestSessions.length === 0) return null;

  for (const item of guestSessions) {
    const ts = (item as unknown as { table_session: TableSession | null }).table_session;
    if (ts && ts.table_id === tableId && ts.status === SessionStatus.ACTIVE) {
      const guestSession: GuestSession = {
        id: item.id,
        table_session_id: item.table_session_id,
        session_token: item.session_token,
        created_at: item.created_at,
        last_seen_at: item.last_seen_at,
      };
      return { tableSession: ts, guestSession };
    }
  }

  return null;
}

/**
 * Join or create a table session and guest session.
 * - If the table has an active session, join it.
 * - Otherwise, create a new one.
 * - Register or find the guest session within the table session.
 */
export async function joinOrCreateSession(
  tableId: string,
  guestToken: string,
): Promise<{ tableSession: TableSession; guestSession: GuestSession }> {
  // 1. Find active session for table
  const { data: existingSession } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('table_id', tableId)
    .eq('status', SessionStatus.ACTIVE)
    .maybeSingle();

  let tableSession: TableSession;

  if (existingSession) {
    tableSession = existingSession as TableSession;
  } else {
    // Create new session
    const { data: newSession, error } = await supabase
      .from('table_sessions')
      .insert({
        table_id: tableId,
        status: SessionStatus.ACTIVE,
      })
      .select()
      .single();

    if (error || !newSession) throw new Error(error?.message ?? 'Failed to create session');
    tableSession = newSession as TableSession;
  }

  // 2. Find or create guest session
  const { data: existingGuest } = await supabase
    .from('guest_sessions')
    .select('*')
    .eq('table_session_id', tableSession.id)
    .eq('session_token', guestToken)
    .maybeSingle();

  let guestSession: GuestSession;

  if (existingGuest) {
    // Update last_seen
    const { data: updated } = await supabase
      .from('guest_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existingGuest.id)
      .select()
      .single();
    guestSession = (updated ?? existingGuest) as GuestSession;
  } else {
    const { data: newGuest, error } = await supabase
      .from('guest_sessions')
      .insert({
        table_session_id: tableSession.id,
        session_token: guestToken,
      })
      .select()
      .single();

    if (error || !newGuest) throw new Error(error?.message ?? 'Failed to create guest session');
    guestSession = newGuest as GuestSession;
  }

  return { tableSession, guestSession };
}

/**
 * Fetch the active session for a table (if any).
 */
export async function getActiveSession(tableId: string): Promise<TableSession | null> {
  const { data } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('table_id', tableId)
    .eq('status', SessionStatus.ACTIVE)
    .maybeSingle();

  return data as TableSession | null;
}

/**
 * Open a table session explicitly (Owner or Staff action).
 */
export async function openTableSession(tableId: string): Promise<TableSession> {
  const existing = await getActiveSession(tableId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('table_sessions')
    .insert({
      table_id: tableId,
      status: SessionStatus.ACTIVE,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to open table session');
  return data as TableSession;
}

/**
 * Close a table session (Owner action).
 * Validates all orders are served and bill is paid.
 */
export async function closeTableSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('close_table_session', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message);
}

/**
 * Transfer an active table session to another empty table.
 * Source table becomes available, and target table receives all session orders/bills.
 */
export async function transferTableSession(
  sessionId: string,
  targetTableId: string,
): Promise<{ sourceTableName?: string | undefined; targetTableName: string }> {
  // 1. Try DB RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('transfer_table_session', {
    p_session_id: sessionId,
    p_target_table_id: targetTableId,
  });

  if (!rpcError && rpcData) {
    const result = rpcData as {
      source_table_name?: string;
      target_table_name?: string;
    };
    return {
      sourceTableName: result.source_table_name,
      targetTableName: result.target_table_name || '',
    };
  }

  // 2. Fallback client-side logic with robust validations
  // Verify session exists and is ACTIVE
  const { data: session, error: sErr } = await supabase
    .from('table_sessions')
    .select('*, table:tables(id, name)')
    .eq('id', sessionId)
    .eq('status', SessionStatus.ACTIVE)
    .single();

  if (sErr || !session) {
    throw new Error('ไม่พบข้อมูลเซสชันโต๊ะ หรือโต๊ะนี้ไม่ได้เปิดอยู่');
  }

  if (session.table_id === targetTableId) {
    throw new Error('ไม่สามารถย้ายไปยังโต๊ะเดิมได้');
  }

  // Check target table exists and is active
  const { data: targetTable, error: tErr } = await supabase
    .from('tables')
    .select('id, name, is_active')
    .eq('id', targetTableId)
    .eq('is_active', true)
    .single();

  if (tErr || !targetTable) {
    throw new Error('ไม่พบโต๊ะปลายทาง หรือโต๊ะปลายทางถูกปิดใช้งาน');
  }

  // Check target table has no active sessions
  const { data: activeOnTarget } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('table_id', targetTableId)
    .eq('status', SessionStatus.ACTIVE)
    .limit(1);

  if (activeOnTarget && activeOnTarget.length > 0) {
    throw new Error(`โต๊ะ "${targetTable.name}" มีลูกค้านั่งอยู่แล้ว ไม่สามารถย้ายไปได้`);
  }

  // Update session table_id
  const { error: updateErr } = await supabase
    .from('table_sessions')
    .update({ table_id: targetTableId })
    .eq('id', sessionId);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  return {
    sourceTableName: (session as unknown as { table?: { name?: string } }).table?.name,
    targetTableName: targetTable.name,
  };
}

/**
 * Completely delete a table session and all associated orders, bills, items.
 */
export async function deleteTableSession(sessionId: string): Promise<void> {
  const { error: rpcErr } = await supabase.rpc('delete_table_session_cascade', {
    p_session_id: sessionId,
  });

  if (!rpcErr) return;

  // Fallback direct delete
  const { error } = await supabase
    .from('table_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}
