-- ============================================================================
-- Migration 00014: Transfer Active Table Session (ย้ายโต๊ะ)
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_table_session(
  p_session_id UUID,
  p_target_table_id UUID
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

  -- 5. Check target table availability (must NOT have any ACTIVE sessions)
  SELECT COUNT(*) INTO v_active_target_session_count
  FROM table_sessions
  WHERE table_id = p_target_table_id AND status = 'ACTIVE';

  IF v_active_target_session_count > 0 THEN
    RAISE EXCEPTION 'Target table is already occupied';
  END IF;

  -- 6. Update session to new table
  UPDATE table_sessions
  SET table_id = p_target_table_id
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'source_table_id', v_source_table.id,
    'source_table_name', v_source_table.name,
    'target_table_id', v_target_table.id,
    'target_table_name', v_target_table.name
  );
END;
$$;
