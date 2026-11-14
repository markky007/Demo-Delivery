-- Add owner identity without guessing account IDs from email or client state.
-- The allowlist is fail-closed. Provision the owner UID before exposing owner
-- operations after this migration is applied.
CREATE TABLE IF NOT EXISTS public.owner_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.owner_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_users TO service_role;
ALTER TABLE public.daily_queue_counters ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.daily_queue_counters TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.owner_users WHERE user_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated, service_role;

CREATE POLICY "Owner full access" ON public.daily_queue_counters
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner()))
  WITH CHECK ((SELECT public.is_owner()));

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'restaurants', 'tables', 'table_qr_tokens', 'table_sessions',
    'guest_sessions', 'menu_categories', 'menu_items', 'option_groups',
    'options', 'menu_item_option_groups', 'orders', 'order_items',
    'order_item_options', 'bills'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Owner full access', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()))',
      'Owner full access', v_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Staff can read order histories" ON public.order_histories;
CREATE POLICY "Owner full access" ON public.order_histories
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner()))
  WITH CHECK ((SELECT public.is_owner()));

DROP POLICY IF EXISTS "Staff can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete menu images" ON storage.objects;
CREATE POLICY "Owner can upload menu images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND (SELECT public.is_owner()));
CREATE POLICY "Owner can update menu images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND (SELECT public.is_owner()))
  WITH CHECK (bucket_id = 'menu-images' AND (SELECT public.is_owner()));
CREATE POLICY "Owner can delete menu images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND (SELECT public.is_owner()));

-- Run owner-only operations as the caller, so the owner RLS policies above
-- apply to every table read and write inside each function.
ALTER FUNCTION public.owner_update_order_item_price(UUID, INTEGER, INTEGER, TEXT) SECURITY INVOKER;
ALTER FUNCTION public.kitchen_update_order(UUID, JSONB) SECURITY INVOKER;
ALTER FUNCTION public.set_order_items_completed(UUID[], BOOLEAN) SECURITY INVOKER;
ALTER FUNCTION public.advance_order_status(UUID, public.order_status) SECURITY INVOKER;
ALTER FUNCTION public.delete_order_and_session(UUID) SECURITY INVOKER;
ALTER FUNCTION public.delete_table_session_cascade(UUID) SECURITY INVOKER;
ALTER FUNCTION public.close_table_session(UUID) SECURITY INVOKER;
ALTER FUNCTION public.owner_add_quick_item(UUID, TEXT, INTEGER, INTEGER) SECURITY INVOKER;
ALTER FUNCTION public.calculate_and_update_bill(UUID) SECURITY INVOKER;
ALTER FUNCTION public.refresh_table_qr_token(UUID, INTEGER) SECURITY INVOKER;
ALTER FUNCTION public.transfer_table_session(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION public.transfer_table_session(UUID, UUID, TEXT) SECURITY INVOKER;
ALTER FUNCTION public.transfer_table_session(UUID, UUID, TEXT, BOOLEAN) SECURITY INVOKER;
ALTER FUNCTION public.get_order_history(UUID) SECURITY INVOKER;
ALTER FUNCTION public.get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) SECURITY INVOKER;
ALTER FUNCTION public.get_paginated_bills(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_paginated_bills(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_paginated_bills(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) TO authenticated, service_role;

-- Owner quick-add also calls this helper. Run it with caller RLS so an
-- authenticated account outside the allowlist cannot increment the counter.
ALTER FUNCTION public.get_next_daily_queue_number() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_next_daily_queue_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_daily_queue_number() TO authenticated, service_role;
