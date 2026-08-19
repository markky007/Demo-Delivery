-- ============================================================================
-- Migration 00007: Add calculate_and_update_bill Function
-- ============================================================================

-- Function to auto-calculate and update bill for a table session
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
  -- Sum up total_amount of all non-cancelled orders in this session
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total
  FROM orders
  WHERE table_session_id = p_table_session_id
    AND status != 'CANCELLED';

  -- Upsert bill for table session
  INSERT INTO bills (table_session_id, total_amount, status)
  VALUES (p_table_session_id, v_total, 'PENDING')
  ON CONFLICT (table_session_id)
  DO UPDATE SET
    total_amount = EXCLUDED.total_amount
    WHERE bills.status = 'PENDING';
END;
$$;
