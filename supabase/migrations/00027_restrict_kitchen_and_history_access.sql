-- Owner and kitchen operations must not be callable with the public anon key.
REVOKE EXECUTE ON FUNCTION public.kitchen_update_order(UUID, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_order_items_completed(UUID[], BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_order_status(UUID, public.order_status) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_order_and_session(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_table_session_cascade(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_table_session(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_add_quick_item(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_and_update_bill(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refresh_table_qr_token(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_table_session(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_table_session(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_table_session(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_order_history(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.kitchen_update_order(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_order_items_completed(UUID[], BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_order_status(UUID, public.order_status) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_order_and_session(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_table_session_cascade(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_table_session(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owner_add_quick_item(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_and_update_bill(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_table_qr_token(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_table_session(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_table_session(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_table_session(UUID, UUID, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_order_history(UUID) TO authenticated, service_role;

-- A customer may view revisions only by proving possession of that order's guest token.
CREATE OR REPLACE FUNCTION public.get_order_history_for_guest(
  p_order_id UUID,
  p_guest_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_guest_session_token IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.orders AS o
    JOIN public.guest_sessions AS gs ON gs.table_session_id = o.table_session_id
    WHERE o.id = p_order_id AND gs.session_token = p_guest_session_token
  ) THEN
    RAISE EXCEPTION 'Order not found or access denied' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'order_id', h.order_id,
          'revision', h.revision,
          'items_snapshot', h.items_snapshot,
          'total_amount', h.total_amount,
          'edited_by', h.edited_by,
          'created_at', h.created_at
        ) ORDER BY h.revision
      ),
      '[]'::jsonb
    )
    FROM public.order_histories AS h
    WHERE h.order_id = p_order_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_order_history_for_guest(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_history_for_guest(UUID, TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow public read access to order_histories" ON public.order_histories;
DROP POLICY IF EXISTS "Allow all access to order_histories for service role / authenticated" ON public.order_histories;
CREATE POLICY "Staff can read order histories" ON public.order_histories
  FOR SELECT TO authenticated USING (true);

-- Menu images remain publicly readable, but only signed-in staff may change them.
DROP POLICY IF EXISTS "Allow public uploads for menu images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates for menu images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete for menu images" ON storage.objects;
CREATE POLICY "Staff can upload menu images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');
CREATE POLICY "Staff can update menu images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images') WITH CHECK (bucket_id = 'menu-images');
CREATE POLICY "Staff can delete menu images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'menu-images');
