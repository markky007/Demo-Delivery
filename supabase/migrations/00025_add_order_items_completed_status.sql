-- ============================================================================
-- Migration 00025: Add Order Items Completed Status and Realtime Sync RPC
-- Adds is_completed and completed_at columns to order_items.
-- Provides a SECURITY DEFINER RPC set_order_items_completed to allow atomic
-- and instant checklist toggling from kitchen iPad devices.
-- ============================================================================

-- 1. Add is_completed and completed_at columns to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Add index for quick query filtering
CREATE INDEX IF NOT EXISTS idx_order_items_is_completed
  ON order_items (order_id, is_completed);

-- 3. Create RPC function for fast background persistence
CREATE OR REPLACE FUNCTION set_order_items_completed(
  p_item_ids UUID[],
  p_is_completed BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  UPDATE order_items
  SET
    is_completed = p_is_completed,
    completed_at = CASE WHEN p_is_completed THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = ANY(p_item_ids);
END;
$$;

-- 4. Grant execution permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION set_order_items_completed(UUID[], BOOLEAN) TO anon, authenticated, service_role;

-- 5. Add order_items to realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback gracefully if publication configuration varies
    NULL;
END;
$$;
