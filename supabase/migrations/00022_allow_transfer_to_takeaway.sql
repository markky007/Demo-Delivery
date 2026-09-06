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
