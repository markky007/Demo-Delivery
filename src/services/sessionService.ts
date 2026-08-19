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
