-- ============================================================================
-- Migration 00017: Daily Queue Number Reset (#001 each day)
-- ============================================================================

-- 1. Create table to store daily queue counters
CREATE TABLE IF NOT EXISTS daily_queue_counters (
  counter_date DATE PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Populate initial counter for today based on existing orders
INSERT INTO daily_queue_counters (counter_date, last_number, updated_at)
SELECT
  (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE,
  COALESCE(MAX(queue_number), 0),
  NOW()
FROM orders
WHERE (created_at AT TIME ZONE 'Asia/Bangkok')::DATE = (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE
ON CONFLICT (counter_date) DO NOTHING;

-- 3. Drop global unique constraint on orders(queue_number) to allow daily reset
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_queue_number_key;
DROP INDEX IF EXISTS idx_orders_queue;
CREATE INDEX IF NOT EXISTS idx_orders_created_queue ON orders (created_at, queue_number);

-- 4. Helper function to atomically generate next queue number for today
CREATE OR REPLACE FUNCTION get_next_daily_queue_number()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  v_queue_num BIGINT;
BEGIN
  INSERT INTO daily_queue_counters (counter_date, last_number, updated_at)
  VALUES (v_today, 1, NOW())
  ON CONFLICT (counter_date)
  DO UPDATE SET
    last_number = daily_queue_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_queue_num;

  RETURN v_queue_num;
END;
$$;

-- 5. Update create_order to use get_next_daily_queue_number()
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
  v_table_id UUID;
  v_table_active BOOLEAN;
  v_qr_valid BOOLEAN;
  v_order_id UUID;
  v_queue_num BIGINT;
  v_item JSONB;
  v_menu_item RECORD;
  v_options_json JSONB;
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
  SELECT status, table_id INTO v_session_status, v_table_id
  FROM table_sessions
  WHERE id = p_table_session_id;

  IF NOT FOUND OR v_session_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Table session is not active or has already been closed. Please rescan table QR code.';
  END IF;

  -- 2. Validate table is active
  SELECT is_active INTO v_table_active
  FROM tables
  WHERE id = v_table_id;

  IF NOT FOUND OR v_table_active = false THEN
    RAISE EXCEPTION 'Table is inactive or not available';
  END IF;

  -- 3. Validate active QR token exists for table
  SELECT EXISTS (
    SELECT 1 FROM table_qr_tokens
    WHERE table_id = v_table_id
      AND is_active = true
  ) INTO v_qr_valid;

  IF NOT v_qr_valid THEN
    RAISE EXCEPTION 'Table QR Code is not active. Please contact staff.';
  END IF;

  -- 4. Find or create guest session
  SELECT id INTO v_guest_session_id
  FROM guest_sessions
  WHERE table_session_id = p_table_session_id
    AND session_token = p_guest_session_token;

  IF NOT FOUND THEN
    INSERT INTO guest_sessions (table_session_id, session_token)
    VALUES (p_table_session_id, p_guest_session_token)
    RETURNING id INTO v_guest_session_id;
  END IF;

  -- 5. Get next queue number for today
  v_queue_num := get_next_daily_queue_number();

  -- 6. Create empty order header
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

  -- 7. Loop over items, validate and insert snapshots
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

    -- Extract options array from selected_option_ids or option_ids
    v_options_json := COALESCE(v_item->'selected_option_ids', v_item->'option_ids');

    -- Loop over options if any
    IF v_options_json IS NOT NULL AND jsonb_typeof(v_options_json) = 'array' AND jsonb_array_length(v_options_json) > 0 THEN
      FOR v_opt_id_text IN SELECT * FROM jsonb_array_elements_text(v_options_json)
      LOOP
        v_opt_id := v_opt_id_text::UUID;

        SELECT o.*, og.name AS group_name
        INTO v_option
        FROM options o
        JOIN option_groups og ON og.id = o.option_group_id
        WHERE o.id = v_opt_id
          AND o.is_active = true
          AND og.is_active = true;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Option not found or inactive';
        END IF;

        IF NOT v_option.is_available THEN
          RAISE EXCEPTION 'Option "%" is currently unavailable', v_option.name;
        END IF;

        -- Insert order item option snapshot
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
      END LOOP;
    END IF;

    -- Calculate item subtotal = (base_price + options) * quantity
    v_item_subtotal := (v_menu_item.base_price + v_options_subtotal) * v_item_qty;

    -- Update order item subtotal
    UPDATE order_items
    SET subtotal = v_item_subtotal
    WHERE id = v_order_item_id;

    v_order_total := v_order_total + v_item_subtotal;
  END LOOP;

  -- 8. Update order total amount
  UPDATE orders
  SET total_amount = v_order_total
  WHERE id = v_order_id;

  -- 9. Auto-create or recalculate bill
  PERFORM calculate_and_update_bill(p_table_session_id);

  -- Return complete order as JSON
  RETURN (
    SELECT json_build_object(
      'id', o.id,
      'table_session_id', o.table_session_id,
      'guest_session_id', o.guest_session_id,
      'queue_number', o.queue_number,
      'status', o.status,
      'total_amount', o.total_amount,
      'created_at', o.created_at
    )
    FROM orders o
    WHERE o.id = v_order_id
  );
END;
$$;

-- 6. Update owner_add_quick_item to use get_next_daily_queue_number()
CREATE OR REPLACE FUNCTION owner_add_quick_item(
  p_table_session_id UUID,
  p_item_name TEXT,
  p_price INTEGER,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_queue_num BIGINT;
  v_subtotal INTEGER;
  v_menu_item_id UUID;
  v_guest_session_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  -- Try to find or reuse existing guest_session_id for table session
  SELECT id INTO v_guest_session_id
  FROM guest_sessions
  WHERE table_session_id = p_table_session_id
  LIMIT 1;

  IF v_guest_session_id IS NULL THEN
    INSERT INTO guest_sessions (table_session_id, session_token)
    VALUES (p_table_session_id, 'owner-quick-add-' || uuid_generate_v4()::TEXT)
    RETURNING id INTO v_guest_session_id;
  END IF;

  -- Try to match existing menu item ID if available
  SELECT id INTO v_menu_item_id
  FROM menu_items
  WHERE name = p_item_name
  LIMIT 1;

  v_subtotal := p_price * p_quantity;
  v_queue_num := get_next_daily_queue_number();

  -- Create order header marked as SERVED directly for owner quick add
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
    'SERVED',
    v_subtotal
  ) RETURNING id INTO v_order_id;

  -- Insert order item
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
    v_menu_item_id,
    p_item_name,
    p_price,
    'เพิ่มโดยร้านค้า (Quick Add)',
    p_quantity,
    NULL,
    v_subtotal
  );

  -- Auto-recalculate bill for session
  PERFORM calculate_and_update_bill(p_table_session_id);

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'subtotal', v_subtotal
  );
END;
$$;
