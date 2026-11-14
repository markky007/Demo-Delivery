-- Resolve only the QR presented by the customer; do not expose the token list.
CREATE OR REPLACE FUNCTION public.resolve_table_token(p_public_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_qr public.table_qr_tokens%ROWTYPE;
  v_table public.tables%ROWTYPE;
  v_restaurant public.restaurants%ROWTYPE;
BEGIN
  SELECT * INTO v_qr FROM public.table_qr_tokens
  WHERE public_token = p_public_token
  ORDER BY is_active DESC, generated_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'NOT_FOUND');
  END IF;
  IF NOT v_qr.is_active OR (v_qr.expires_at IS NOT NULL AND v_qr.expires_at <= now()) THEN
    RETURN jsonb_build_object('status', 'EXPIRED');
  END IF;

  SELECT * INTO v_table FROM public.tables WHERE id = v_qr.table_id;
  IF NOT FOUND OR NOT v_table.is_active THEN
    RETURN jsonb_build_object('status', 'INACTIVE');
  END IF;

  SELECT * INTO v_restaurant FROM public.restaurants WHERE id = v_table.restaurant_id;
  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'qrToken', to_jsonb(v_qr),
    'table', to_jsonb(v_table),
    'restaurant', to_jsonb(v_restaurant)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_table_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_table_token(TEXT) TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Anon read qr tokens" ON public.table_qr_tokens;

-- Keep the existing atomic order writer, but require the presented QR and a
-- previously joined guest session before an anonymous caller can invoke it.
CREATE OR REPLACE FUNCTION public.create_order_verified(
  p_table_session_id UUID,
  p_guest_session_token TEXT,
  p_items JSONB,
  p_public_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item' USING ERRCODE = '22023';
  END IF;

  IF p_guest_session_token IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.table_sessions AS ts
    JOIN public.table_qr_tokens AS qr ON qr.table_id = ts.table_id
    JOIN public.guest_sessions AS gs ON gs.table_session_id = ts.id
    WHERE ts.id = p_table_session_id
      AND ts.status = 'ACTIVE'
      AND qr.public_token = p_public_token
      AND qr.is_active = true
      AND (qr.expires_at IS NULL OR qr.expires_at > now())
      AND gs.session_token = p_guest_session_token
  ) THEN
    RAISE EXCEPTION 'Invalid table session or QR token' USING ERRCODE = '42501';
  END IF;

  RETURN public.create_order(p_table_session_id, p_guest_session_token, p_items);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_order_verified(UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_verified(UUID, TEXT, JSONB, TEXT)
  TO anon, authenticated, service_role;
