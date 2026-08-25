-- ============================================================================
-- Migration 00021: Order History Snapshot & Fix Order Update Item Names
-- 1. Creates order_histories table to track order revisions before edit
-- 2. Updates update_order and kitchen_update_order to record previous revision snapshot
-- 3. Fixes item name fallback logic so edited items never turn into 'รายการพิเศษ'
-- 4. Adds get_order_history RPC
-- ============================================================================

-- 1. Create order_histories table
CREATE TABLE IF NOT EXISTS order_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  items_snapshot JSONB NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  edited_by TEXT DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by order_id and revision
CREATE INDEX IF NOT EXISTS idx_order_histories_order_id ON order_histories(order_id);
CREATE INDEX IF NOT EXISTS idx_order_histories_order_revision ON order_histories(order_id, revision);

-- Enable RLS
ALTER TABLE order_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to order_histories"
  ON order_histories FOR SELECT USING (true);

CREATE POLICY "Allow all access to order_histories for service role / authenticated"
  ON order_histories FOR ALL USING (true);

-- 2. Update update_order RPC (Customer edit)
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
  v_table_session RECORD;
  v_guest_session RECORD;
  v_item JSONB;
  v_menu_item RECORD;
  v_options_json JSONB;
  v_opt_id_text TEXT;
  v_opt_id UUID;
  v_option RECORD;
  v_order_item_id UUID;
  v_item_subtotal INTEGER;
  v_options_subtotal INTEGER;
  v_order_total INTEGER := 0;
  v_item_qty INTEGER;
  v_special_instruction TEXT;
  v_item_name TEXT;
  v_item_base_price INTEGER;
  v_item_desc TEXT;
  v_old_items_snapshot JSONB;
BEGIN
  -- 1. Fetch order and check status
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Only QUEUED orders can be edited by the customer (restaurant hasn't started yet)
  IF v_order.status != 'QUEUED' THEN
    RAISE EXCEPTION 'ร้านเริ่มเตรียมอาหารแล้ว ไม่สามารถแก้ไขออเดอร์ได้';
  END IF;

  -- 2. Verify table session is active
  SELECT * INTO v_table_session FROM table_sessions WHERE id = v_order.table_session_id;
  IF NOT FOUND OR v_table_session.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'รอบการสั่งอาหารของโต๊ะนี้สิ้นสุดแล้ว';
  END IF;

  -- 3. Verify guest session token
  SELECT * INTO v_guest_session FROM guest_sessions
  WHERE id = v_order.guest_session_id AND session_token = p_guest_session_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid guest session token';
  END IF;

  -- 4. Ensure there is at least one item
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ออเดอร์ต้องมีรายการอาหารอย่างน้อย 1 รายการ';
  END IF;

  -- 5. Record snapshot of existing items into order_histories before replacement
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'menu_item_id', oi.menu_item_id,
      'snapshot_name', oi.snapshot_name,
      'snapshot_base_price', oi.snapshot_base_price,
      'snapshot_description', oi.snapshot_description,
      'quantity', oi.quantity,
      'special_instruction', oi.special_instruction,
      'subtotal', oi.subtotal,
      'options', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', oio.id,
              'option_id', oio.option_id,
              'option_group_id', oio.option_group_id,
              'snapshot_option_name', oio.snapshot_option_name,
              'snapshot_group_name', oio.snapshot_group_name,
              'snapshot_price_adjustment', oio.snapshot_price_adjustment
            )
          )
          FROM order_item_options oio
          WHERE oio.order_item_id = oi.id
        ),
        '[]'::jsonb
      )
    )
  )
  INTO v_old_items_snapshot
  FROM order_items oi
  WHERE oi.order_id = p_order_id;

  IF v_old_items_snapshot IS NOT NULL THEN
    INSERT INTO order_histories (
      order_id,
      revision,
      items_snapshot,
      total_amount,
      edited_by
    ) VALUES (
      p_order_id,
      v_order.revision,
      v_old_items_snapshot,
      v_order.total_amount,
      'CUSTOMER'
    );
  END IF;

  -- 6. Delete existing items (cascades to order_item_options)
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- 7. Re-insert items with snapshots
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'menu_item_id') IS NOT NULL AND (v_item->>'menu_item_id') != '' THEN
      SELECT * INTO v_menu_item FROM menu_items
      WHERE id = (v_item->>'menu_item_id')::UUID;
    ELSE
      v_menu_item := NULL;
    END IF;

    IF v_menu_item IS NOT NULL AND NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'เมนู "%" หมดชั่วคราว ไม่สามารถสั่งได้', v_menu_item.name;
    END IF;

    v_item_qty := (v_item->>'quantity')::INTEGER;
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'จำนวนต้องมากกว่า 0';
    END IF;

    v_special_instruction := v_item->>'special_instruction';
    IF char_length(v_special_instruction) > 200 THEN
      RAISE EXCEPTION 'ข้อความเพิ่มเติมต้องไม่เกิน 200 ตัวอักษร';
    END IF;

    v_item_name := COALESCE(
      v_item->>'name',
      v_item->>'snapshot_name',
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.name ELSE 'รายการพิเศษ' END
    );

    v_item_base_price := COALESCE(
      (v_item->>'base_price')::INTEGER,
      (v_item->>'snapshot_base_price')::INTEGER,
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.base_price ELSE 0 END
    );

    v_item_desc := COALESCE(
      v_item->>'description',
      v_item->>'snapshot_description',
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.description ELSE NULL END
    );

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
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.id ELSE NULL END,
      v_item_name,
      v_item_base_price,
      v_item_desc,
      v_item_qty,
      v_special_instruction,
      0
    ) RETURNING id INTO v_order_item_id;

    -- Extract options array from selected_option_ids or option_ids
    v_options_json := COALESCE(v_item->'selected_option_ids', v_item->'option_ids');

    IF v_options_json IS NOT NULL AND jsonb_typeof(v_options_json) = 'array' AND jsonb_array_length(v_options_json) > 0 THEN
      FOR v_opt_id_text IN SELECT * FROM jsonb_array_elements_text(v_options_json)
      LOOP
        v_opt_id := v_opt_id_text::UUID;

        SELECT o.*, og.name as group_name
        INTO v_option
        FROM options o
        JOIN option_groups og ON og.id = o.option_group_id
        WHERE o.id = v_opt_id;

        IF FOUND THEN
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

          v_options_subtotal := v_options_subtotal + v_option.price_adjustment;
        END IF;
      END LOOP;
    END IF;

    v_item_subtotal := (v_item_base_price + v_options_subtotal) * v_item_qty;
    UPDATE order_items SET subtotal = v_item_subtotal WHERE id = v_order_item_id;
    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 8. Update order total & bump revision
  UPDATE orders SET
    total_amount = v_order_total,
    revision = revision + 1,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 9. Auto-recalculate bill
  PERFORM calculate_and_update_bill(v_order.table_session_id);

  RETURN (SELECT to_jsonb(o) FROM orders o WHERE o.id = p_order_id);
END;
$$;

-- 3. Update kitchen_update_order RPC (Kitchen / Staff edit)
CREATE OR REPLACE FUNCTION kitchen_update_order(
  p_order_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_table_session RECORD;
  v_item JSONB;
  v_menu_item RECORD;
  v_options_json JSONB;
  v_opt_id_text TEXT;
  v_opt_id UUID;
  v_option RECORD;
  v_order_item_id UUID;
  v_item_subtotal INTEGER;
  v_options_subtotal INTEGER;
  v_order_total INTEGER := 0;
  v_item_qty INTEGER;
  v_special_instruction TEXT;
  v_item_name TEXT;
  v_item_base_price INTEGER;
  v_item_desc TEXT;
  v_old_items_snapshot JSONB;
BEGIN
  -- 1. Fetch order and check status
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'SERVED' THEN
    RAISE EXCEPTION 'ไม่สามารถแก้ไขออเดอร์ที่เสิร์ฟแล้วได้';
  END IF;

  -- 2. Verify table session exists and is active
  SELECT * INTO v_table_session FROM table_sessions WHERE id = v_order.table_session_id;
  IF NOT FOUND OR v_table_session.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'รอบการสั่งอาหารของโต๊ะนี้สิ้นสุดแล้ว';
  END IF;

  -- 3. Ensure there is at least one item
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ออเดอร์ต้องมีรายการอาหารอย่างน้อย 1 รายการ';
  END IF;

  -- 4. Record snapshot of existing items into order_histories before replacement
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'menu_item_id', oi.menu_item_id,
      'snapshot_name', oi.snapshot_name,
      'snapshot_base_price', oi.snapshot_base_price,
      'snapshot_description', oi.snapshot_description,
      'quantity', oi.quantity,
      'special_instruction', oi.special_instruction,
      'subtotal', oi.subtotal,
      'options', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', oio.id,
              'option_id', oio.option_id,
              'option_group_id', oio.option_group_id,
              'snapshot_option_name', oio.snapshot_option_name,
              'snapshot_group_name', oio.snapshot_group_name,
              'snapshot_price_adjustment', oio.snapshot_price_adjustment
            )
          )
          FROM order_item_options oio
          WHERE oio.order_item_id = oi.id
        ),
        '[]'::jsonb
      )
    )
  )
  INTO v_old_items_snapshot
  FROM order_items oi
  WHERE oi.order_id = p_order_id;

  IF v_old_items_snapshot IS NOT NULL THEN
    INSERT INTO order_histories (
      order_id,
      revision,
      items_snapshot,
      total_amount,
      edited_by
    ) VALUES (
      p_order_id,
      v_order.revision,
      v_old_items_snapshot,
      v_order.total_amount,
      'KITCHEN'
    );
  END IF;

  -- 5. Delete existing items (cascades to order_item_options)
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- 6. Re-insert items with snapshots
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'menu_item_id') IS NOT NULL AND (v_item->>'menu_item_id') != '' THEN
      SELECT * INTO v_menu_item FROM menu_items
      WHERE id = (v_item->>'menu_item_id')::UUID;
    ELSE
      v_menu_item := NULL;
    END IF;

    v_item_qty := (v_item->>'quantity')::INTEGER;
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'จำนวนต้องมากกว่า 0';
    END IF;

    v_special_instruction := v_item->>'special_instruction';
    IF char_length(v_special_instruction) > 200 THEN
      RAISE EXCEPTION 'ข้อความเพิ่มเติมต้องไม่เกิน 200 ตัวอักษร';
    END IF;

    v_item_name := COALESCE(
      v_item->>'name',
      v_item->>'snapshot_name',
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.name ELSE 'รายการพิเศษ' END
    );

    v_item_base_price := COALESCE(
      (v_item->>'base_price')::INTEGER,
      (v_item->>'snapshot_base_price')::INTEGER,
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.base_price ELSE 0 END
    );

    v_item_desc := COALESCE(
      v_item->>'description',
      v_item->>'snapshot_description',
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.description ELSE NULL END
    );

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
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.id ELSE NULL END,
      v_item_name,
      v_item_base_price,
      v_item_desc,
      v_item_qty,
      v_special_instruction,
      0
    ) RETURNING id INTO v_order_item_id;

    -- Extract options array from selected_option_ids or option_ids
    v_options_json := COALESCE(v_item->'selected_option_ids', v_item->'option_ids');

    IF v_options_json IS NOT NULL AND jsonb_typeof(v_options_json) = 'array' AND jsonb_array_length(v_options_json) > 0 THEN
      FOR v_opt_id_text IN SELECT * FROM jsonb_array_elements_text(v_options_json)
      LOOP
        v_opt_id := v_opt_id_text::UUID;

        SELECT o.*, og.name as group_name
        INTO v_option
        FROM options o
        JOIN option_groups og ON og.id = o.option_group_id
        WHERE o.id = v_opt_id;

        IF FOUND THEN
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

          v_options_subtotal := v_options_subtotal + v_option.price_adjustment;
        END IF;
      END LOOP;
    END IF;

    v_item_subtotal := (v_item_base_price + v_options_subtotal) * v_item_qty;
    UPDATE order_items SET subtotal = v_item_subtotal WHERE id = v_order_item_id;
    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 7. Update order total & bump revision
  UPDATE orders SET
    total_amount = v_order_total,
    revision = revision + 1,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 8. Auto-recalculate bill
  PERFORM calculate_and_update_bill(v_order.table_session_id);

  RETURN (SELECT to_jsonb(o) FROM orders o WHERE o.id = p_order_id);
END;
$$;

-- 4. Function to get order revision history
CREATE OR REPLACE FUNCTION get_order_history(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'order_id', h.order_id,
          'revision', h.revision,
          'items_snapshot', h.items_snapshot,
          'total_amount', h.total_amount,
          'edited_by', h.edited_by,
          'created_at', h.created_at
        )
        ORDER BY h.revision ASC
      ),
      '[]'::jsonb
    )
    FROM order_histories h
    WHERE h.order_id = p_order_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_order(UUID, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION kitchen_update_order(UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_order_history(UUID) TO anon, authenticated, service_role;
