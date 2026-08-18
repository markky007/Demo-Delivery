/**
 * Database entity types matching the PostgreSQL schema.
 * These are the raw row types returned by Supabase queries.
 */

import type { OrderStatus, SessionStatus, BillStatus, SelectionType } from './enums';

// ─── Restaurant ──────────────────────────────────────────────
export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Table ───────────────────────────────────────────────────
export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Table QR Token ──────────────────────────────────────────
export interface TableQRToken {
  id: string;
  table_id: string;
  public_token: string;
  is_active: boolean;
  generated_at: string;
  revoked_at: string | null;
}

// ─── Table Session ───────────────────────────────────────────
export interface TableSession {
  id: string;
  table_id: string;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
}

// ─── Guest Session ───────────────────────────────────────────
export interface GuestSession {
  id: string;
  table_session_id: string;
  session_token: string;
  created_at: string;
  last_seen_at: string;
}

// ─── Menu Category ───────────────────────────────────────────
export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Menu Item ───────────────────────────────────────────────
export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  is_active: boolean;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Option Group ────────────────────────────────────────────
export interface OptionGroup {
  id: string;
  restaurant_id: string;
  name: string;
  is_required: boolean;
  selection_type: SelectionType;
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Option ──────────────────────────────────────────────────
export interface Option {
  id: string;
  option_group_id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Menu Item ↔ Option Group (Join) ─────────────────────────
export interface MenuItemOptionGroup {
  id: string;
  menu_item_id: string;
  option_group_id: string;
  sort_order: number;
}

// ─── Order ───────────────────────────────────────────────────
export interface Order {
  id: string;
  table_session_id: string;
  guest_session_id: string;
  queue_number: number;
  status: OrderStatus;
  total_amount: number;
  revision: number;
  created_at: string;
  queued_at: string;
  preparing_at: string | null;
  prepared_at: string | null;
  served_at: string | null;
  updated_at: string;
}

// ─── Order Item ──────────────────────────────────────────────
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  snapshot_name: string;
  snapshot_base_price: number;
  snapshot_description: string | null;
  quantity: number;
  special_instruction: string | null;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

// ─── Order Item Option ───────────────────────────────────────
export interface OrderItemOption {
  id: string;
  order_item_id: string;
  option_id: string;
  option_group_id: string;
  snapshot_option_name: string;
  snapshot_group_name: string;
  snapshot_price_adjustment: number;
}

// ─── Bill ────────────────────────────────────────────────────
export interface Bill {
  id: string;
  table_session_id: string;
  total_amount: number;
  status: BillStatus;
  created_at: string;
  paid_at: string | null;
}

// ─── Composite types for joined queries ──────────────────────

export interface MenuItemWithOptions extends MenuItem {
  option_groups: (OptionGroup & { options: Option[] })[];
}

export interface OrderWithItems extends Order {
  table_session?: {
    id: string;
    table?: {
      id: string;
      name: string;
    } | null;
  } | null;
  items: (OrderItem & { options: OrderItemOption[] })[];
}

export interface TableWithQR extends Table {
  active_qr: TableQRToken | null;
}

export interface TableSessionWithOrders extends TableSession {
  orders: Order[];
  guest_sessions: GuestSession[];
  table: Table;
}
