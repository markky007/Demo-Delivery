-- ============================================================================
-- Migration 00022: Allow Transfer Table Session to Takeaway & Update Customer Name
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_table_session(
  p_session_id UUID,
  p_target_table_id UUID,
  p_customer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_source_table RECORD;
  v_target_table RECORD;
  v_active_target_session_count INTEGER;
  v_is_target_takeaway BOOLEAN;
  v_new_customer_name TEXT;
BEGIN
  -- 1. Get and lock the session to move
  SELECT * INTO v_session
  FROM table_sessions
  WHERE id = p_session_id AND status = 'ACTIVE'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table session not found or is not active';
  END IF;

  -- 2. Verify source table
  SELECT * INTO v_source_table
  FROM tables
  WHERE id = v_session.table_id;

  -- 3. Check if target table is the same
  IF v_session.table_id = p_target_table_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same table';
  END IF;

  -- 4. Get target table
  SELECT * INTO v_target_table
  FROM tables
  WHERE id = p_target_table_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target table not found or is inactive';
  END IF;

  -- Check if target table is Takeaway
  v_is_target_takeaway := (
    v_target_table.name = 'สั่งกลับบ้าน' OR
    v_target_table.name = 'กลับบ้าน' OR
    v_target_table.name ILIKE '%กลับบ้าน%' OR
    v_target_table.name ILIKE '%takeaway%'
  );

  -- 5. Check target table availability (must NOT have any ACTIVE sessions unless target is takeaway)
  IF NOT v_is_target_takeaway THEN
    SELECT COUNT(*) INTO v_active_target_session_count
    FROM table_sessions
    WHERE table_id = p_target_table_id AND status = 'ACTIVE';

    IF v_active_target_session_count > 0 THEN
      RAISE EXCEPTION 'Target table is already occupied';
    END IF;
  END IF;

  -- 6. Resolve customer name
  v_new_customer_name := COALESCE(
    NULLIF(TRIM(p_customer_name), ''),
    v_session.customer_name,
    CASE WHEN v_is_target_takeaway AND v_source_table.name IS NOT NULL
      THEN 'ลูกค้าจาก ' || v_source_table.name
      ELSE NULL
    END
  );

  -- 7. Update session to new table and updated customer name
  UPDATE table_sessions
  SET table_id = p_target_table_id,
      customer_name = v_new_customer_name
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'source_table_id', v_source_table.id,
    'source_table_name', v_source_table.name,
    'target_table_id', v_target_table.id,
    'target_table_name', v_target_table.name,
    'customer_name', v_new_customer_name
  );
END;
$$;

-- ============================================================================
-- Migration 00022: Allow Unlimited Kitchen Order Edits
-- Removes strict status restriction in kitchen_update_order to let owners
-- edit orders freely across unlimited revisions as long as the table session is ACTIVE.
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
  v_item_name TEXT;
  v_item_base_price INTEGER;
  v_item_desc TEXT;
  v_old_items_snapshot JSONB;
BEGIN
  -- 1. Fetch order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Verify table session exists and is active (can edit any active session)
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

    UPDATE order_items
    SET subtotal = v_item_subtotal
    WHERE id = v_order_item_id;

    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 7. Update orders record (increments revision)
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

GRANT EXECUTE ON FUNCTION kitchen_update_order(UUID, JSONB) TO anon, authenticated, service_role;
