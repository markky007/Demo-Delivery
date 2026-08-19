-- ─── Update advance_order_status to allow direct 2-step flow (QUEUED -> PREPARING -> SERVED) ─────
CREATE OR REPLACE FUNCTION advance_order_status(
  p_order_id UUID,
  p_new_status order_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate state transition: allow standard 3-step or simplified 2-step (QUEUED -> PREPARING -> SERVED)
  IF v_order.status = 'QUEUED' AND p_new_status NOT IN ('PREPARING', 'PREPARED', 'SERVED') THEN
    RAISE EXCEPTION 'Invalid transition from QUEUED to %', p_new_status;
  END IF;

  IF v_order.status = 'PREPARING' AND p_new_status NOT IN ('PREPARED', 'SERVED') THEN
    RAISE EXCEPTION 'Invalid transition from PREPARING to %', p_new_status;
  END IF;

  IF v_order.status = 'PREPARED' AND p_new_status != 'SERVED' THEN
    RAISE EXCEPTION 'PREPARED orders can only transition to SERVED';
  END IF;

  IF v_order.status = 'SERVED' THEN
    RAISE EXCEPTION 'SERVED orders cannot transition further';
  END IF;

  -- Update the order with appropriate timestamp tracking
  UPDATE orders SET
    status = p_new_status,
    preparing_at = CASE 
      WHEN p_new_status = 'PREPARING' AND preparing_at IS NULL THEN NOW() 
      ELSE preparing_at 
    END,
    prepared_at = CASE 
      WHEN p_new_status IN ('PREPARED', 'SERVED') AND prepared_at IS NULL THEN NOW() 
      ELSE prepared_at 
    END,
    served_at = CASE 
      WHEN p_new_status = 'SERVED' THEN NOW() 
      ELSE served_at 
    END,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'id', p_order_id,
    'status', p_new_status,
    'success', true
  );
END;
$$;
