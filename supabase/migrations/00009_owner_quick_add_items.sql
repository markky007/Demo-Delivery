-- ============================================================================
-- Migration 00009: Owner Quick Add Items to Bill & Allow Nullable Columns
-- ============================================================================

-- 1. Allow menu_item_id and guest_session_id to be nullable in orders/order_items for custom/quick-add items
ALTER TABLE order_items ALTER COLUMN menu_item_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN guest_session_id DROP NOT NULL;

-- 2. RPC function for owner to quickly add items (like drinks) directly to table session
CREATE OR REPLACE FUNCTION owner_add_quick_item(
  p_table_session_id UUID,
  p_item_name TEXT,
  p_price INTEGER,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_queue_num BIGINT;
  v_subtotal INTEGER;
  v_menu_item_id UUID;
  v_guest_session_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  -- Try to find or reuse existing guest_session_id for table session
  SELECT id INTO v_guest_session_id
  FROM guest_sessions
  WHERE table_session_id = p_table_session_id
  LIMIT 1;

  IF v_guest_session_id IS NULL THEN
    INSERT INTO guest_sessions (table_session_id, session_token)
    VALUES (p_table_session_id, 'owner-quick-add-' || uuid_generate_v4()::TEXT)
    RETURNING id INTO v_guest_session_id;
  END IF;

  -- Try to match existing menu item ID if available
  SELECT id INTO v_menu_item_id
  FROM menu_items
  WHERE name = p_item_name
  LIMIT 1;

  v_subtotal := p_price * p_quantity;
  v_queue_num := nextval('order_queue_seq');

  -- Create order header marked as SERVED directly for owner quick add
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
    'SERVED',
    v_subtotal
  ) RETURNING id INTO v_order_id;

  -- Insert order item
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
    v_menu_item_id,
    p_item_name,
    p_price,
    'เพิ่มโดยร้านค้า (Quick Add)',
    p_quantity,
    NULL,
    v_subtotal
  );

  -- Auto-recalculate bill for session
  PERFORM calculate_and_update_bill(p_table_session_id);

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'subtotal', v_subtotal
  );
END;
$$;
