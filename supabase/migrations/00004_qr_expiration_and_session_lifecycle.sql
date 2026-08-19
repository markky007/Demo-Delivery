-- ============================================================================
-- Migration 00004: QR Code Expiration & Table Session Lifecycle
-- ============================================================================

-- 1. Add expires_at column to table_qr_tokens
ALTER TABLE table_qr_tokens
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill existing active tokens to expire in 24 hours if NULL
UPDATE table_qr_tokens
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE is_active = true AND expires_at IS NULL;

-- Index for lookup with expiry check
CREATE INDEX IF NOT EXISTS idx_table_qr_active_expiry
  ON table_qr_tokens (public_token, is_active, expires_at);

-- 2. Function to generate a new random alphanumeric token
CREATE OR REPLACE FUNCTION generate_random_qr_token(length INT DEFAULT 10)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Function to refresh / regenerate QR token for a table
CREATE OR REPLACE FUNCTION refresh_table_qr_token(
  p_table_id UUID,
  p_expires_in_hours INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_qr_record RECORD;
BEGIN
  -- Revoke existing active tokens
  UPDATE table_qr_tokens
  SET is_active = false,
      revoked_at = NOW()
  WHERE table_id = p_table_id
    AND is_active = true;

  -- Generate unique token
  LOOP
    v_new_token := generate_random_qr_token(10);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM table_qr_tokens
      WHERE public_token = v_new_token AND is_active = true
    );
  END LOOP;

  IF p_expires_in_hours IS NOT NULL AND p_expires_in_hours > 0 THEN
    v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
  ELSE
    v_expires_at := NULL;
  END IF;

  INSERT INTO table_qr_tokens (
    table_id,
    public_token,
    is_active,
    generated_at,
    expires_at
  ) VALUES (
    p_table_id,
    v_new_token,
    true,
    NOW(),
    v_expires_at
  )
  RETURNING * INTO v_qr_record;

  RETURN to_jsonb(v_qr_record);
END;
$$;

-- 4. Update close_table_session to auto-revoke old QR and generate fresh QR
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

  -- Auto-revoke current QR token and generate a fresh one for the next customer
  IF v_table_id IS NOT NULL THEN
    PERFORM refresh_table_qr_token(v_table_id, 24);
  END IF;
END;
$$;

-- 5. Update create_order to validate QR token is active & not expired
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
    RAISE EXCEPTION 'Table session is not active or has already been closed';
  END IF;

  -- 2. Validate table is active
  SELECT is_active INTO v_table_active
  FROM tables
  WHERE id = v_table_id;

  IF NOT FOUND OR v_table_active = false THEN
    RAISE EXCEPTION 'Table is inactive or not available';
  END IF;

  -- 3. Validate active QR token exists and has not expired
  SELECT EXISTS (
    SELECT 1 FROM table_qr_tokens
    WHERE table_id = v_table_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_qr_valid;

  IF NOT v_qr_valid THEN
    RAISE EXCEPTION 'QR Code has expired. Please rescan the QR code at the table.';
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
