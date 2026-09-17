-- ============================================================================
-- Migration 00023: Support Table Merge in transfer_table_session RPC
-- Allows moving an active table session into an already occupied table (Table Merge)
-- ============================================================================

-- 1. Add merged_into_session_id column to table_sessions if not exists
ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS merged_into_session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_table_sessions_merged_into
  ON table_sessions (merged_into_session_id);

-- 2. Create or replace transfer_table_session with p_allow_merge parameter
CREATE OR REPLACE FUNCTION transfer_table_session(
  p_session_id UUID,
  p_target_table_id UUID,
  p_customer_name TEXT DEFAULT NULL,
  p_allow_merge BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_source_table RECORD;
  v_target_table RECORD;
  v_target_session RECORD;
  v_active_target_session_count INTEGER;
  v_is_target_takeaway BOOLEAN;
  v_new_customer_name TEXT;
  v_guest RECORD;
  v_existing_guest_id UUID;
  v_merged_order_count INTEGER;
  v_new_total_amount INTEGER;
BEGIN
  -- 1. Get and lock the source session to move
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

  -- 5. Check target table occupancy
  SELECT COUNT(*) INTO v_active_target_session_count
  FROM table_sessions
  WHERE table_id = p_target_table_id AND status = 'ACTIVE';

  -- --------------------------------------------------------------------------
  -- CASE A: Target table is OCCUPIED (Table Merge)
  -- --------------------------------------------------------------------------
  IF NOT v_is_target_takeaway AND v_active_target_session_count > 0 THEN
    IF NOT p_allow_merge THEN
      RAISE EXCEPTION 'Target table is already occupied';
    END IF;

    -- Get and lock the active session on target table
    SELECT * INTO v_target_session
    FROM table_sessions
    WHERE table_id = p_target_table_id AND status = 'ACTIVE'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Active session on target table not found';
    END IF;

    -- Re-assign all orders from source session to target session
    UPDATE orders
    SET table_session_id = v_target_session.id
    WHERE table_session_id = p_session_id;

    -- Re-assign guest_sessions from source to target, resolving token uniqueness collisions
    FOR v_guest IN (
      SELECT * FROM guest_sessions WHERE table_session_id = p_session_id
    ) LOOP
      IF EXISTS (
        SELECT 1 FROM guest_sessions
        WHERE table_session_id = v_target_session.id
          AND session_token = v_guest.session_token
      ) THEN
        -- Token already exists in target session; re-point orders to existing guest_session
        SELECT id INTO v_existing_guest_id
        FROM guest_sessions
        WHERE table_session_id = v_target_session.id
          AND session_token = v_guest.session_token;

        UPDATE orders
        SET guest_session_id = v_existing_guest_id
        WHERE guest_session_id = v_guest.id;

        DELETE FROM guest_sessions WHERE id = v_guest.id;
      ELSE
        -- Token does not exist in target session; safely move it
        UPDATE guest_sessions
        SET table_session_id = v_target_session.id
        WHERE id = v_guest.id;
      END IF;
    END LOOP;

    -- Delete pending bill of source session (orders are now part of target session)
    DELETE FROM bills
    WHERE table_session_id = p_session_id;

    -- Recalculate target session's bill with all combined orders
    PERFORM calculate_and_update_bill(v_target_session.id);

    -- Resolve customer name for target session
    IF p_customer_name IS NOT NULL AND TRIM(p_customer_name) <> '' THEN
      v_new_customer_name := TRIM(p_customer_name);
    ELSIF v_target_session.customer_name IS NOT NULL AND v_session.customer_name IS NOT NULL THEN
      IF v_target_session.customer_name = v_session.customer_name THEN
        v_new_customer_name := v_target_session.customer_name;
      ELSE
        v_new_customer_name := v_target_session.customer_name || ' / ' || v_session.customer_name;
      END IF;
    ELSE
      v_new_customer_name := COALESCE(v_target_session.customer_name, v_session.customer_name);
    END IF;

    UPDATE table_sessions
    SET customer_name = v_new_customer_name
    WHERE id = v_target_session.id;

    -- Close the source session, marking merged_into_session_id
    -- Source table immediately becomes AVAILABLE (no active session on source table)
    UPDATE table_sessions
    SET status = 'CLOSED',
        closed_at = NOW(),
        merged_into_session_id = v_target_session.id
    WHERE id = p_session_id;

    -- Get total orders and new bill total for response
    SELECT COUNT(*) INTO v_merged_order_count
    FROM orders
    WHERE table_session_id = v_target_session.id;

    SELECT COALESCE(total_amount, 0) INTO v_new_total_amount
    FROM bills
    WHERE table_session_id = v_target_session.id;

    RETURN jsonb_build_object(
      'success', true,
      'mode', 'MERGED',
      'session_id', v_target_session.id,
      'source_session_id', p_session_id,
      'source_table_id', v_source_table.id,
      'source_table_name', v_source_table.name,
      'target_table_id', v_target_table.id,
      'target_table_name', v_target_table.name,
      'customer_name', v_new_customer_name,
      'order_count', v_merged_order_count,
      'total_amount', v_new_total_amount
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- CASE B: Target table is EMPTY or TAKEAWAY (Standard Move)
  -- --------------------------------------------------------------------------
  -- Resolve customer name
  v_new_customer_name := COALESCE(
    NULLIF(TRIM(p_customer_name), ''),
    v_session.customer_name,
    CASE WHEN v_is_target_takeaway AND v_source_table.name IS NOT NULL
      THEN 'ลูกค้าจาก ' || v_source_table.name
      ELSE NULL
    END
  );

  -- Update session to new table
  UPDATE table_sessions
  SET table_id = p_target_table_id,
      customer_name = v_new_customer_name
  WHERE id = p_session_id;

  SELECT COUNT(*) INTO v_merged_order_count
  FROM orders
  WHERE table_session_id = p_session_id;

  SELECT COALESCE(total_amount, 0) INTO v_new_total_amount
  FROM bills
  WHERE table_session_id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'mode', 'TRANSFERRED',
    'session_id', p_session_id,
    'source_table_id', v_source_table.id,
    'source_table_name', v_source_table.name,
    'target_table_id', v_target_table.id,
    'target_table_name', v_target_table.name,
    'customer_name', v_new_customer_name,
    'order_count', v_merged_order_count,
    'total_amount', v_new_total_amount
  );
END;
$$;
