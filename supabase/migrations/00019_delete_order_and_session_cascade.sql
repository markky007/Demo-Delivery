-- ============================================================================
-- Migration 00019: Delete Order and Table Session Cascade (ลบออเดอร์และล้างเซสชันโต๊ะ)
-- ============================================================================

-- Function to delete an order and completely purge its table session,
-- bill, guest sessions, order items, and reset table to AVAILABLE.
CREATE OR REPLACE FUNCTION delete_order_and_session(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_session_id UUID;
  v_table_id UUID;
  v_table_name TEXT;
  v_customer_name TEXT;
  v_queue_number BIGINT;
BEGIN
  -- 1. Find order and lock it
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_session_id := v_order.table_session_id;
  v_queue_number := v_order.queue_number;

  -- 2. Get table and session info
  SELECT ts.customer_name, t.id, t.name
  INTO v_customer_name, v_table_id, v_table_name
  FROM table_sessions ts
  LEFT JOIN tables t ON t.id = ts.table_id
  WHERE ts.id = v_session_id;

  -- 3. Delete the table session.
  -- By ON DELETE CASCADE foreign keys, this automatically deletes:
  -- - table_sessions row
  -- - all orders in this session
  -- - all order_items in those orders
  -- - all order_item_options in those order_items
  -- - all guest_sessions in this session
  -- - all bills in this session
  -- This frees the table immediately back to AVAILABLE.
  DELETE FROM table_sessions
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_order_id', p_order_id,
    'queue_number', v_queue_number,
    'table_session_id', v_session_id,
    'table_id', v_table_id,
    'table_name', COALESCE(v_table_name, 'Unknown Table'),
    'customer_name', v_customer_name
  );
END;
$$;

-- Function to delete a table session directly by session ID
CREATE OR REPLACE FUNCTION delete_table_session_cascade(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_id UUID;
  v_table_name TEXT;
  v_customer_name TEXT;
BEGIN
  SELECT ts.customer_name, t.id, t.name
  INTO v_customer_name, v_table_id, v_table_name
  FROM table_sessions ts
  LEFT JOIN tables t ON t.id = ts.table_id
  WHERE ts.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table session not found';
  END IF;

  DELETE FROM table_sessions
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'table_session_id', p_session_id,
    'table_id', v_table_id,
    'table_name', COALESCE(v_table_name, 'Unknown Table'),
    'customer_name', v_customer_name
  );
END;
$$;
