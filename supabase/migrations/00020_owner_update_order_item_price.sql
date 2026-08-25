-- ============================================================================
-- Migration 00020: Add RPC for Owner to Update Order Item Price and Recalculate Bill
-- ============================================================================

-- Function to allow owner/cashier to modify order item price (e.g., custom requests in comments)
CREATE OR REPLACE FUNCTION owner_update_order_item_price(
  p_order_item_id UUID,
  p_new_base_price INTEGER,
  p_new_subtotal INTEGER DEFAULT NULL,
  p_special_instruction TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_item RECORD;
  v_order RECORD;
  v_options_subtotal INTEGER := 0;
  v_final_subtotal INTEGER;
  v_order_total INTEGER := 0;
BEGIN
  -- 1. Find the order item
  SELECT * INTO v_order_item
  FROM order_items
  WHERE id = p_order_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  -- 2. Find the associated order
  SELECT * INTO v_order
  FROM orders
  WHERE id = v_order_item.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for this item';
  END IF;

  -- 3. Calculate options sum for this item
  SELECT COALESCE(SUM(snapshot_price_adjustment), 0)
  INTO v_options_subtotal
  FROM order_item_options
  WHERE order_item_id = p_order_item_id;

  -- 4. Determine final subtotal
  IF p_new_subtotal IS NOT NULL AND p_new_subtotal >= 0 THEN
    v_final_subtotal := p_new_subtotal;
  ELSE
    v_final_subtotal := (p_new_base_price + v_options_subtotal) * v_order_item.quantity;
  END IF;

  -- 5. Update order item
  UPDATE order_items
  SET
    snapshot_base_price = p_new_base_price,
    subtotal = v_final_subtotal,
    special_instruction = COALESCE(p_special_instruction, special_instruction),
    updated_at = NOW()
  WHERE id = p_order_item_id;

  -- 6. Recalculate order total amount
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_order_total
  FROM order_items
  WHERE order_id = v_order.id;

  UPDATE orders
  SET
    total_amount = v_order_total,
    updated_at = NOW()
  WHERE id = v_order.id;

  -- 7. Recalculate and update bill for the session
  IF v_order.table_session_id IS NOT NULL THEN
    PERFORM calculate_and_update_bill(v_order.table_session_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'order_id', v_order.id,
    'new_base_price', p_new_base_price,
    'new_subtotal', v_final_subtotal,
    'new_order_total', v_order_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION owner_update_order_item_price(UUID, INTEGER, INTEGER, TEXT) TO anon, authenticated, service_role;
