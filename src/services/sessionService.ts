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
 * Close a table session (Owner action).
 * Validates all orders are served and bill is paid.
 */
export async function closeTableSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('close_table_session', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message);
}
