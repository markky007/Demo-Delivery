-- ============================================================================
-- Migration 00016: Kitchen & Staff Order Modification
-- Allows kitchen staff / owner to edit order items, quantities, options, and
-- notes directly from kitchen queue (Focus Mode / Overview) without guest session token.
-- ============================================================================

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
BEGIN
  -- 1. Fetch order and check status
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'ไม่สามารถแก้ไขออเดอร์ที่ถูกยกเลิกแล้วได้';
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

  -- 4. Delete existing items (cascades to order_item_options)
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- 5. Re-insert items with snapshots
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
      COALESCE(v_item->>'name', CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.name ELSE 'รายการพิเศษ' END),
      COALESCE((v_item->>'base_price')::INTEGER, CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.base_price ELSE 0 END),
      CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.description ELSE NULL END,
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

    v_item_subtotal := (COALESCE((v_item->>'base_price')::INTEGER, CASE WHEN v_menu_item IS NOT NULL THEN v_menu_item.base_price ELSE 0 END) + v_options_subtotal) * v_item_qty;
    UPDATE order_items SET subtotal = v_item_subtotal WHERE id = v_order_item_id;
    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 6. Update order total & bump revision
  UPDATE orders SET
    total_amount = v_order_total,
    revision = revision + 1,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 7. Auto-recalculate bill
  PERFORM calculate_and_update_bill(v_order.table_session_id);

  RETURN (SELECT to_jsonb(o) FROM orders o WHERE o.id = p_order_id);
END;
$$;
