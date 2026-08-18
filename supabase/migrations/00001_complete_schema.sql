-- =============================================================================
-- QR Food Ordering System — Complete Database Schema
-- =============================================================================
-- Run this migration against your Supabase PostgreSQL database.
-- This creates all tables, sequences, functions, triggers, indexes, and RLS policies.
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE order_status AS ENUM ('QUEUED', 'PREPARING', 'PREPARED', 'SERVED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE bill_status AS ENUM ('PENDING', 'PAID');
CREATE TYPE selection_type AS ENUM ('single', 'multi');

-- ─── Sequence for FIFO queue numbers ────────────────────────────────────────
CREATE SEQUENCE order_queue_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ─── Restaurants ────────────────────────────────────────────────────────────
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tables ─────────────────────────────────────────────────────────────────
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table QR Tokens ────────────────────────────────────────────────────────
CREATE TABLE table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Only one active token per table
CREATE UNIQUE INDEX idx_table_qr_active
  ON table_qr_tokens (table_id) WHERE is_active = true;

-- Fast lookup by public token
CREATE UNIQUE INDEX idx_table_qr_public_token
  ON table_qr_tokens (public_token) WHERE is_active = true;

-- ─── Table Sessions ─────────────────────────────────────────────────────────
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Only one active session per table
CREATE UNIQUE INDEX idx_table_session_active
  ON table_sessions (table_id) WHERE status = 'ACTIVE';

-- ─── Guest Sessions ─────────────────────────────────────────────────────────
CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique guest per session
CREATE UNIQUE INDEX idx_guest_session_token
  ON guest_sessions (table_session_id, session_token);

-- ─── Menu Categories ────────────────────────────────────────────────────────
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Menu Items ─────────────────────────────────────────────────────────────
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price INTEGER NOT NULL CHECK (base_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON menu_items (category_id) WHERE is_active = true;

-- ─── Option Groups ──────────────────────────────────────────────────────────
CREATE TABLE option_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  selection_type selection_type NOT NULL DEFAULT 'single',
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Options ────────────────────────────────────────────────────────────────
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Menu Item ↔ Option Group Join ──────────────────────────────────────────
CREATE TABLE menu_item_option_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(menu_item_id, option_group_id)
);

-- ─── Orders ─────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  guest_session_id UUID NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  queue_number BIGINT NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'QUEUED',
  total_amount INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preparing_at TIMESTAMPTZ,
  prepared_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_session ON orders (table_session_id, status);
CREATE INDEX idx_orders_queue ON orders (queue_number);
CREATE INDEX idx_orders_status ON orders (status) WHERE status != 'SERVED';

-- ─── Order Items ────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  snapshot_name TEXT NOT NULL,
  snapshot_base_price INTEGER NOT NULL,
  snapshot_description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  special_instruction TEXT CHECK (char_length(special_instruction) <= 200),
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ─── Order Item Options ─────────────────────────────────────────────────────
CREATE TABLE order_item_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id),
  option_group_id UUID NOT NULL REFERENCES option_groups(id),
  snapshot_option_name TEXT NOT NULL,
  snapshot_group_name TEXT NOT NULL,
  snapshot_price_adjustment INTEGER NOT NULL
);

CREATE INDEX idx_order_item_options_item ON order_item_options (order_item_id);

-- ─── Bills ──────────────────────────────────────────────────────────────────
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL DEFAULT 0,
  status bill_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- One bill per session
CREATE UNIQUE INDEX idx_bills_session ON bills (table_session_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- ─── Advance Order Status (with FIFO gate for SERVED) ───────────────────────
CREATE OR REPLACE FUNCTION advance_order_status(
  p_order_id UUID,
  p_new_status order_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_unserved_before INTEGER;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate state transition
  IF v_order.status = 'QUEUED' AND p_new_status != 'PREPARING' THEN
    RAISE EXCEPTION 'QUEUED orders can only transition to PREPARING';
  END IF;

  IF v_order.status = 'PREPARING' AND p_new_status != 'PREPARED' THEN
    RAISE EXCEPTION 'PREPARING orders can only transition to PREPARED';
  END IF;

  IF v_order.status = 'PREPARED' AND p_new_status != 'SERVED' THEN
    RAISE EXCEPTION 'PREPARED orders can only transition to SERVED';
  END IF;

  IF v_order.status = 'SERVED' THEN
    RAISE EXCEPTION 'SERVED orders cannot transition further';
  END IF;

  -- FIFO Gate: When transitioning to SERVED, check all earlier orders are served
  IF p_new_status = 'SERVED' THEN
    SELECT COUNT(*) INTO v_unserved_before
    FROM orders
    WHERE queue_number < v_order.queue_number
      AND status != 'SERVED'
      -- Same restaurant scope: check via table_session -> table -> restaurant
      AND table_session_id IN (
        SELECT ts.id FROM table_sessions ts
        JOIN tables t ON t.id = ts.table_id
        WHERE t.restaurant_id = (
          SELECT t2.restaurant_id
          FROM table_sessions ts2
          JOIN tables t2 ON t2.id = ts2.table_id
          WHERE ts2.id = v_order.table_session_id
        )
      );

    IF v_unserved_before > 0 THEN
      RAISE EXCEPTION 'Cannot serve order #% — % earlier order(s) not yet served (FIFO constraint)',
        v_order.queue_number, v_unserved_before;
    END IF;
  END IF;

  -- Update the order
  UPDATE orders SET
    status = p_new_status,
    preparing_at = CASE WHEN p_new_status = 'PREPARING' THEN NOW() ELSE preparing_at END,
    prepared_at = CASE WHEN p_new_status = 'PREPARED' THEN NOW() ELSE prepared_at END,
    served_at = CASE WHEN p_new_status = 'SERVED' THEN NOW() ELSE served_at END,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Return updated order
  RETURN (SELECT to_jsonb(o) FROM orders o WHERE o.id = p_order_id);
END;
$$;

-- ─── Close Table Session ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION close_table_session(
  p_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unserved INTEGER;
  v_bill_status bill_status;
BEGIN
  -- Check all orders are served
  SELECT COUNT(*) INTO v_unserved
  FROM orders
  WHERE table_session_id = p_session_id
    AND status != 'SERVED';

  IF v_unserved > 0 THEN
    RAISE EXCEPTION 'Cannot close session — % order(s) not yet served', v_unserved;
  END IF;

  -- Check bill is paid
  SELECT status INTO v_bill_status
  FROM bills
  WHERE table_session_id = p_session_id;

  IF v_bill_status IS NULL OR v_bill_status != 'PAID' THEN
    RAISE EXCEPTION 'Cannot close session — bill is not paid';
  END IF;

  -- Close the session
  UPDATE table_sessions SET
    status = 'CLOSED',
    closed_at = NOW()
  WHERE id = p_session_id;
END;
$$;

-- ─── Create Order (Atomic with server validation & price snapshots) ─────────
CREATE OR REPLACE FUNCTION create_order(
  p_table_session_id UUID,
  p_guest_session_token TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_session_id UUID;
  v_session_status session_status;
  v_order_id UUID;
  v_queue_num BIGINT;
  v_item JSONB;
  v_menu_item RECORD;
  v_opt_id_text TEXT;
  v_opt_id UUID;
  v_option RECORD;
  v_item_subtotal INTEGER;
  v_options_subtotal INTEGER;
  v_order_total INTEGER := 0;
  v_order_item_id UUID;
  v_item_qty INTEGER;
  v_special_instruction TEXT;
BEGIN
  -- 1. Validate table session is active
  SELECT status INTO v_session_status
  FROM table_sessions
  WHERE id = p_table_session_id;

  IF NOT FOUND OR v_session_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Table session is not active or does not exist';
  END IF;

  -- 2. Find or create guest session
  SELECT id INTO v_guest_session_id
  FROM guest_sessions
  WHERE table_session_id = p_table_session_id
    AND session_token = p_guest_session_token;

  IF NOT FOUND THEN
    INSERT INTO guest_sessions (table_session_id, session_token)
    VALUES (p_table_session_id, p_guest_session_token)
    RETURNING id INTO v_guest_session_id;
  END IF;

  -- 3. Get next queue number from sequence
  v_queue_num := nextval('order_queue_seq');

  -- 4. Create empty order header
  INSERT INTO orders (
    table_session_id,
    guest_session_id,
    queue_number,
    status,
    total_amount
  ) VALUES (
    p_table_session_id,
    v_guest_session_id,
    v_queue_num,
    'QUEUED',
    0
  ) RETURNING id INTO v_order_id;

  -- 5. Loop over items, validate and insert snapshots
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get menu item
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item not found or inactive';
    END IF;

    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'Menu item "%" is currently sold out', v_menu_item.name;
    END IF;

    v_item_qty := (v_item->>'quantity')::INTEGER;
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than 0';
    END IF;

    v_special_instruction := v_item->>'special_instruction';
    IF char_length(v_special_instruction) > 200 THEN
      RAISE EXCEPTION 'Special instruction exceeds 200 characters limit';
    END IF;

    -- Calculate options subtotal
    v_options_subtotal := 0;

    -- Insert order item header first to get id
    INSERT INTO order_items (
      order_id,
      menu_item_id,
      snapshot_name,
      snapshot_base_price,
      snapshot_description,
      quantity,
      special_instruction,
      subtotal
    ) VALUES (
      v_order_id,
      v_menu_item.id,
      v_menu_item.name,
      v_menu_item.base_price,
      v_menu_item.description,
      v_item_qty,
      v_special_instruction,
      0
    ) RETURNING id INTO v_order_item_id;

    -- Process selected options
    IF v_item ? 'selected_option_ids' AND jsonb_array_length(v_item->'selected_option_ids') > 0 THEN
      FOR v_opt_id_text IN SELECT jsonb_array_elements_text(v_item->'selected_option_ids')
      LOOP
        v_opt_id := v_opt_id_text::UUID;

        SELECT o.*, og.name as group_name
        INTO v_option
        FROM options o
        JOIN option_groups og ON og.id = o.option_group_id
        WHERE o.id = v_opt_id
          AND o.is_active = true
          AND og.is_active = true;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Selected option not found or inactive';
        END IF;

        IF NOT v_option.is_available THEN
          RAISE EXCEPTION 'Option "%" is currently unavailable', v_option.name;
        END IF;

        v_options_subtotal := v_options_subtotal + v_option.price_adjustment;

        -- Insert snapshot of option
        INSERT INTO order_item_options (
          order_item_id,
          option_id,
          option_group_id,
          snapshot_option_name,
          snapshot_group_name,
          snapshot_price_adjustment
        ) VALUES (
          v_order_item_id,
          v_option.id,
          v_option.option_group_id,
          v_option.name,
          v_option.group_name,
          v_option.price_adjustment
        );
      END LOOP;
    END IF;

    -- Calculate item subtotal
    v_item_subtotal := (v_menu_item.base_price + v_options_subtotal) * v_item_qty;
    UPDATE order_items SET subtotal = v_item_subtotal WHERE id = v_order_item_id;

    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 6. Update order total amount
  UPDATE orders SET total_amount = v_order_total WHERE id = v_order_id;

  -- 7. Return complete order JSON
  RETURN (SELECT to_jsonb(o) FROM orders o WHERE o.id = v_order_id);
END;
$$;

-- ─── Update Order (Allowed only when QUEUED or PREPARING) ───────────────────
CREATE OR REPLACE FUNCTION update_order(
  p_order_id UUID,
  p_guest_session_token TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_menu_item RECORD;
  v_opt_id_text TEXT;
  v_opt_id UUID;
  v_option RECORD;
  v_item_subtotal INTEGER;
  v_options_subtotal INTEGER;
  v_order_total INTEGER := 0;
  v_order_item_id UUID;
  v_item_qty INTEGER;
  v_special_instruction TEXT;
BEGIN
  -- 1. Lock order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Validate editability (QUEUED or PREPARING only)
  IF v_order.status NOT IN ('QUEUED', 'PREPARING') THEN
    RAISE EXCEPTION 'Order is % and cannot be edited', v_order.status;
  END IF;

  -- 3. Delete existing items & options
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- 4. Re-insert updated items with fresh snapshots
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item not found or inactive';
    END IF;

    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'Menu item "%" is currently sold out', v_menu_item.name;
    END IF;

    v_item_qty := (v_item->>'quantity')::INTEGER;
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than 0';
    END IF;

    v_special_instruction := v_item->>'special_instruction';
    v_options_subtotal := 0;

    INSERT INTO order_items (
      order_id,
      menu_item_id,
      snapshot_name,
      snapshot_base_price,
      snapshot_description,
      quantity,
      special_instruction,
      subtotal
    ) VALUES (
      p_order_id,
      v_menu_item.id,
      v_menu_item.name,
      v_menu_item.base_price,
      v_menu_item.description,
      v_item_qty,
      v_special_instruction,
      0
    ) RETURNING id INTO v_order_item_id;

    IF v_item ? 'selected_option_ids' AND jsonb_array_length(v_item->'selected_option_ids') > 0 THEN
      FOR v_opt_id_text IN SELECT jsonb_array_elements_text(v_item->'selected_option_ids')
      LOOP
        v_opt_id := v_opt_id_text::UUID;

        SELECT o.*, og.name as group_name
        INTO v_option
        FROM options o
        JOIN option_groups og ON og.id = o.option_group_id
        WHERE o.id = v_opt_id
          AND o.is_active = true;

        IF NOT FOUND OR NOT v_option.is_available THEN
          RAISE EXCEPTION 'Option is unavailable';
        END IF;

        v_options_subtotal := v_options_subtotal + v_option.price_adjustment;

        INSERT INTO order_item_options (
          order_item_id,
          option_id,
          option_group_id,
          snapshot_option_name,
          snapshot_group_name,
          snapshot_price_adjustment
        ) VALUES (
          v_order_item_id,
          v_option.id,
          v_option.option_group_id,
          v_option.name,
          v_option.group_name,
          v_option.price_adjustment
        );
      END LOOP;
    END IF;

    v_item_subtotal := (v_menu_item.base_price + v_options_subtotal) * v_item_qty;
    UPDATE order_items SET subtotal = v_item_subtotal WHERE id = v_order_item_id;
    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 5. Update order total & bump revision
  UPDATE orders SET
    total_amount = v_order_total,
    revision = revision + 1,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN (SELECT to_jsonb(o) FROM orders o WHERE o.id = p_order_id);
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ─── Authenticated (Owner) — full access ────────────────────────────────────
CREATE POLICY "Owner full access" ON restaurants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON table_qr_tokens FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON table_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON guest_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON option_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON menu_item_option_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON order_item_options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Owner full access" ON bills FOR ALL USING (auth.role() = 'authenticated');

-- ─── Anonymous (Customer) — read access ─────────────────────────────────────
CREATE POLICY "Anon read restaurants" ON restaurants FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "Anon read tables" ON tables FOR SELECT USING (auth.role() = 'anon' AND is_active = true);
CREATE POLICY "Anon read qr tokens" ON table_qr_tokens FOR SELECT USING (auth.role() = 'anon' AND is_active = true);
CREATE POLICY "Anon read categories" ON menu_categories FOR SELECT USING (auth.role() = 'anon' AND is_active = true);
CREATE POLICY "Anon read items" ON menu_items FOR SELECT USING (auth.role() = 'anon' AND is_active = true);
CREATE POLICY "Anon read option groups" ON option_groups FOR SELECT USING (auth.role() = 'anon' AND is_active = true);
CREATE POLICY "Anon read options" ON options FOR SELECT USING (auth.role() = 'anon' AND is_active = true);
CREATE POLICY "Anon read join table" ON menu_item_option_groups FOR SELECT USING (auth.role() = 'anon');

-- ─── Anonymous (Customer) — session access ──────────────────────────────────
CREATE POLICY "Anon read sessions" ON table_sessions FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "Anon insert sessions" ON table_sessions FOR INSERT WITH CHECK (auth.role() = 'anon');
CREATE POLICY "Anon read guests" ON guest_sessions FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "Anon insert guests" ON guest_sessions FOR INSERT WITH CHECK (auth.role() = 'anon');
CREATE POLICY "Anon update guests" ON guest_sessions FOR UPDATE USING (auth.role() = 'anon');

-- ─── Anonymous (Customer) — order access ────────────────────────────────────
CREATE POLICY "Anon read orders" ON orders FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "Anon read order items" ON order_items FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "Anon read order item options" ON order_item_options FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "Anon read bills" ON bills FOR SELECT USING (auth.role() = 'anon');

-- =============================================================================
-- REALTIME
-- =============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Create the restaurant
INSERT INTO restaurants (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Restaurant', 'A demo restaurant for QR food ordering');

-- Create sample tables
INSERT INTO tables (id, restaurant_id, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Table 01', 1),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Table 02', 2),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Table 03', 3),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Table 04', 4),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'Table 05', 5);

-- Create QR tokens for tables
INSERT INTO table_qr_tokens (table_id, public_token) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Tbl01Demo9x'),
  ('00000000-0000-0000-0000-000000000102', 'Tbl02Demo8y'),
  ('00000000-0000-0000-0000-000000000103', 'Tbl03Demo7z'),
  ('00000000-0000-0000-0000-000000000104', 'Tbl04Demo6w'),
  ('00000000-0000-0000-0000-000000000105', 'Tbl05Demo5v');

-- Create menu categories
INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Appetizers', 1),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Main Courses', 2),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Noodles', 3),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Drinks', 4),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'Desserts', 5);

-- Create menu items
INSERT INTO menu_items (id, category_id, name, description, base_price, sort_order) VALUES
  -- Appetizers
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'Spring Rolls', 'Crispy vegetable spring rolls', 60, 1),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', 'Satay Chicken', 'Grilled chicken skewers with peanut sauce', 80, 2),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000201', 'Tom Yum Soup', 'Spicy and sour shrimp soup', 120, 3),
  -- Main Courses
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000202', 'Green Curry', 'Thai green curry with chicken and rice', 150, 1),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000202', 'Massaman Curry', 'Rich massaman curry with beef', 180, 2),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000202', 'Basil Stir Fry', 'Holy basil stir fry with choice of meat', 120, 3),
  -- Noodles
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000203', 'Pad Thai', 'Classic Thai stir-fried noodles', 100, 1),
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000203', 'Boat Noodles', 'Thai boat noodle soup', 80, 2),
  -- Drinks
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000204', 'Thai Iced Tea', 'Classic orange Thai tea', 45, 1),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000204', 'Fresh Coconut', 'Young coconut water', 60, 2),
  -- Desserts
  ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000205', 'Mango Sticky Rice', 'Sweet sticky rice with ripe mango', 90, 1),
  ('00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000205', 'Coconut Ice Cream', 'Homemade coconut ice cream', 50, 2);

-- Create option groups
INSERT INTO option_groups (id, restaurant_id, name, is_required, selection_type, min_selections, max_selections, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', 'Spice Level', true, 'single', 1, 1, 1),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', 'Protein', true, 'single', 1, 1, 2),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001', 'Toppings', false, 'multi', 0, 3, 3),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000001', 'Size', true, 'single', 1, 1, 4);

-- Create options
INSERT INTO options (id, option_group_id, name, price_adjustment, sort_order) VALUES
  -- Spice Level
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'No Spice', 0, 1),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000401', 'Mild', 0, 2),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000401', 'Medium', 0, 3),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000401', 'Spicy', 0, 4),
  ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000401', 'Very Spicy', 0, 5),
  -- Protein
  ('00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000402', 'Chicken', 0, 1),
  ('00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000402', 'Pork', 0, 2),
  ('00000000-0000-0000-0000-000000000508', '00000000-0000-0000-0000-000000000402', 'Beef', 20, 3),
  ('00000000-0000-0000-0000-000000000509', '00000000-0000-0000-0000-000000000402', 'Shrimp', 30, 4),
  ('00000000-0000-0000-0000-000000000510', '00000000-0000-0000-0000-000000000402', 'Tofu', 0, 5),
  -- Toppings
  ('00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000403', 'Fried Egg', 10, 1),
  ('00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000403', 'Extra Cheese', 20, 2),
  ('00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000403', 'Crispy Shallots', 10, 3),
  -- Size
  ('00000000-0000-0000-0000-000000000514', '00000000-0000-0000-0000-000000000404', 'Regular', 0, 1),
  ('00000000-0000-0000-0000-000000000515', '00000000-0000-0000-0000-000000000404', 'Large', 20, 2);

-- Link option groups to menu items
INSERT INTO menu_item_option_groups (menu_item_id, option_group_id, sort_order) VALUES
  -- Spice Level → main courses, noodles, soup
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000401', 1), -- Tom Yum
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000401', 1), -- Green Curry
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000401', 1), -- Massaman
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000401', 1), -- Basil
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000401', 1), -- Pad Thai
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000401', 1), -- Boat Noodles
  -- Protein → applicable dishes
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000402', 2), -- Basil
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000402', 2), -- Pad Thai
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000402', 2), -- Boat Noodles
  -- Toppings → main courses, noodles
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000403', 3), -- Basil
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000403', 3), -- Pad Thai
  -- Size → drinks
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000404', 1), -- Thai Tea
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000404', 1); -- Coconut
