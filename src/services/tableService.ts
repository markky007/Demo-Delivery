/**
 * Table service — Supabase queries for table and QR management.
 */
import { supabase } from './supabase';
import type { Restaurant, Table, TableQRToken, TableWithQR } from 'src/types/database';

export type ResolveTableResult =
  | {
      status: 'SUCCESS';
      qrToken: TableQRToken;
      table: Table;
      restaurant: Restaurant;
    }
  | { status: 'EXPIRED' }
  | { status: 'INACTIVE' }
  | { status: 'NOT_FOUND' };

/**
 * Resolve a public QR token to a table + restaurant context.
 * Validates token existence, active status, expiration timestamp, and table availability.
 */
export async function resolveTableFromToken(publicToken: string): Promise<ResolveTableResult> {
  const { data, error } = await supabase
    .from('table_qr_tokens')
    .select(
      `
      id,
      table_id,
      public_token,
      is_active,
      generated_at,
      expires_at,
      revoked_at,
      table:tables (
        id,
        restaurant_id,
        name,
        sort_order,
        is_active,
        restaurant:restaurants (
          id,
          name,
          description,
          logo_url,
          latitude,
          longitude,
          geofence_radius_meters,
          is_geofence_enabled
        )
      )
    `,
    )
    .eq('public_token', publicToken)
    .maybeSingle();

  if (error || !data) {
    return { status: 'NOT_FOUND' };
  }

  // Check if token was revoked or marked inactive
  if (!data.is_active) {
    return { status: 'EXPIRED' };
  }

  // Validate table is active
  const tableData = data.table as unknown as Table & {
    restaurant: Restaurant;
  };
  if (!tableData?.is_active) {
    return { status: 'INACTIVE' };
  }

  return {
    status: 'SUCCESS',
    qrToken: data as unknown as TableQRToken,
    table: tableData,
    restaurant: tableData.restaurant,
  };
}

// ─── Owner CRUD ──────────────────────────────────────────

export async function fetchTables(): Promise<TableWithQR[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(
      `
      *,
      active_qr:table_qr_tokens (*)
    `,
    )
    .order('sort_order');

  if (error) throw new Error(error.message);

  // Filter to only active QR tokens
  return (data ?? []).map((t) => ({
    ...t,
    active_qr: Array.isArray(t.active_qr)
      ? (t.active_qr.find((q: TableQRToken) => q.is_active) ?? null)
      : t.active_qr,
  })) as TableWithQR[];
}

export async function createTable(name: string, restaurantId: string): Promise<Table> {
  // Get max sort order
  const { data: maxData } = await supabase
    .from('tables')
    .select('sort_order')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (maxData?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('tables')
    .insert({
      restaurant_id: restaurantId,
      name,
      sort_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Table;
}

export async function updateTable(
  id: string,
  updates: Partial<Pick<Table, 'name' | 'is_active' | 'sort_order'>>,
): Promise<Table> {
  const { data, error } = await supabase
    .from('tables')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Table;
}

export async function generateQRToken(
  tableId: string,
  expiresInHours: number = 0,
): Promise<TableQRToken> {
  // Revoke existing active tokens
  await supabase
    .from('table_qr_tokens')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('table_id', tableId)
    .eq('is_active', true);

  // Generate new token
  const token = generatePublicToken();
  const expiresAt =
    expiresInHours > 0 ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString() : null;

  const { data, error } = await supabase
    .from('table_qr_tokens')
    .insert({
      table_id: tableId,
      public_token: token,
      is_active: true,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TableQRToken;
}

export async function ensureTakeawayTable(restaurantId: string): Promise<TableWithQR> {
  // 1. Look for existing takeaway table
  const { data: existingTables } = await supabase
    .from('tables')
    .select('*, active_qr:table_qr_tokens (*)')
    .eq('restaurant_id', restaurantId)
    .eq('name', 'สั่งกลับบ้าน')
    .limit(1);

  let table: Table;

  if (existingTables && existingTables.length > 0) {
    table = existingTables[0] as Table;
  } else {
    // Create new takeaway table
    const { data: newTable, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        name: 'สั่งกลับบ้าน',
        sort_order: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    table = newTable as Table;
  }

  // 2. Check if active QR token exists
  const { data: tokens } = await supabase
    .from('table_qr_tokens')
    .select('*')
    .eq('table_id', table.id)
    .eq('is_active', true)
    .limit(1);

  let activeQr = tokens && tokens.length > 0 ? (tokens[0] as TableQRToken) : null;
  if (!activeQr) {
    activeQr = await generateQRToken(table.id);
  }

  return {
    ...table,
    active_qr: activeQr,
  };
}

/**
 * Check if a table name is for takeaway.
 */
export function isTakeawayName(name?: string | null): boolean {
  if (!name) return false;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed === 'สั่งกลับบ้าน' ||
    trimmed === 'กลับบ้าน' ||
    trimmed === 'takeaway' ||
    trimmed.includes('กลับบ้าน') ||
    trimmed.includes('takeaway')
  );
}

/**
 * Generate a short, URL-safe random token.
 */
function generatePublicToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

