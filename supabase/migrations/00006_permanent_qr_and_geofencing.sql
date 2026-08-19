-- ============================================================================
-- Migration 00006: Permanent Table QR & Restaurant Geofencing
-- ============================================================================

-- 1. Add geolocation columns to restaurants table
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_geofence_enabled BOOLEAN DEFAULT false;

-- Set default initial coordinates for DEMO Bang Saen if not yet set
UPDATE restaurants
SET latitude = COALESCE(latitude, 13.2849),
    longitude = COALESCE(longitude, 100.9234),
    geofence_radius_meters = COALESCE(geofence_radius_meters, 100),
    is_geofence_enabled = COALESCE(is_geofence_enabled, true)
WHERE latitude IS NULL OR longitude IS NULL;

-- 2. Make all active QR tokens permanent (clear expires_at)
UPDATE table_qr_tokens
SET expires_at = NULL
WHERE is_active = true;

-- 3. Update close_table_session function
-- Important: Do NOT revoke table QR token on close_table_session so printed table sticker remains valid permanently.
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
  v_table_id UUID;
BEGIN
  -- Get table_id for this session
  SELECT table_id INTO v_table_id
  FROM table_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table session not found';
  END IF;

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

  -- Note: We intentionally DO NOT revoke the table QR token here.
  -- The physical QR code sticker on the table is permanent.
  -- When the next customer scans the QR code, joinOrCreateSession will open a fresh active table_session.
END;
$$;

-- 4. Function to auto-calculate and update bill for a table session
CREATE OR REPLACE FUNCTION calculate_and_update_bill(
  p_table_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  -- Calculate sum of non-cancelled orders for this table session
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total
  FROM orders
  WHERE table_session_id = p_table_session_id
    AND status != 'CANCELLED';

  -- Upsert the bill record
  INSERT INTO bills (table_session_id, total_amount, status)
  VALUES (p_table_session_id, v_total, 'PENDING')
  ON CONFLICT (table_session_id)
  DO UPDATE SET
    total_amount = EXCLUDED.total_amount
    WHERE bills.status = 'PENDING';
END;
$$;

-- 5. Update create_order to validate active session (No expires_at constraint on QR)
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

  -- 5. Get next queue number from sequence
  v_queue_num := nextval('order_queue_seq');

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

    -- Loop over options if any
    IF v_item->'option_ids' IS NOT NULL AND jsonb_array_length(v_item->'option_ids') > 0 THEN
      FOR v_opt_id_text IN SELECT * FROM jsonb_array_elements_text(v_item->'option_ids')
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
