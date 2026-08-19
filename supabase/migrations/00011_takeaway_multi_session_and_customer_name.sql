-- ============================================================================
-- Migration 00011: Takeaway Multi-Session & Customer Name Support
-- ============================================================================

-- 1. Add customer_name column to table_sessions table
ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 2. Drop unique active session index to allow multiple concurrent takeaway sessions
DROP INDEX IF EXISTS idx_table_session_active;

-- Create index for quick lookup of active sessions by table_id
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_active
  ON table_sessions (table_id, status);

-- 3. Update close_table_session function
-- Allow closing sessions gracefully even if there are 0 orders or no bill
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
  v_total_orders INTEGER;
BEGIN
  -- Get table_id for this session
  SELECT table_id INTO v_table_id
  FROM table_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table session not found';
  END IF;

  -- Count total orders in this session
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE table_session_id = p_session_id;

  -- If there are orders, check all orders are served
  IF v_total_orders > 0 THEN
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
  END IF;

  -- Close the session
  UPDATE table_sessions SET
    status = 'CLOSED',
    closed_at = NOW()
  WHERE id = p_session_id;
END;
$$;
