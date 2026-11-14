-- Customer access is proved with an unguessable guest token in narrowly scoped RPCs.
-- Direct anonymous table access is removed after the replacement RPCs exist.

CREATE OR REPLACE FUNCTION public.customer_join_session(
  p_public_token TEXT,
  p_guest_token TEXT,
  p_customer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_table public.tables%ROWTYPE;
  v_session public.table_sessions%ROWTYPE;
  v_guest public.guest_sessions%ROWTYPE;
  v_takeaway BOOLEAN;
BEGIN
  IF p_guest_token IS NULL OR p_guest_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid guest token' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_table
  FROM public.table_qr_tokens AS qr
  JOIN public.tables AS t ON t.id = qr.table_id
  WHERE qr.public_token = p_public_token AND qr.is_active AND t.is_active
    AND (qr.expires_at IS NULL OR qr.expires_at > now())
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid table QR' USING ERRCODE = '42501';
  END IF;

  -- Serializes concurrent joins so a dine-in table gets one active session.
  PERFORM 1 FROM public.tables WHERE id = v_table.id FOR UPDATE;
  v_takeaway := v_table.name ILIKE '%takeaway%' OR v_table.name LIKE '%กลับบ้าน%';

  IF v_takeaway THEN
    IF NULLIF(btrim(p_customer_name), '') IS NULL OR char_length(p_customer_name) > 100 THEN
      RAISE EXCEPTION 'Customer name is required (max 100 characters)' USING ERRCODE = '22023';
    END IF;
    SELECT ts.* INTO v_session
    FROM public.table_sessions AS ts
    JOIN public.guest_sessions AS gs ON gs.table_session_id = ts.id
    WHERE ts.table_id = v_table.id AND ts.status = 'ACTIVE'
      AND gs.session_token = p_guest_token
      AND ts.customer_name = btrim(p_customer_name)
    ORDER BY ts.created_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_session
    FROM public.table_sessions
    WHERE table_id = v_table.id AND status = 'ACTIVE'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_session.id IS NULL THEN
    INSERT INTO public.table_sessions(table_id, status, customer_name)
    VALUES (v_table.id, 'ACTIVE', CASE WHEN v_takeaway THEN btrim(p_customer_name) ELSE NULL END)
    RETURNING * INTO v_session;
  END IF;

  INSERT INTO public.guest_sessions(table_session_id, session_token)
  VALUES (v_session.id, p_guest_token)
  ON CONFLICT (table_session_id, session_token)
  DO UPDATE SET last_seen_at = now()
  RETURNING * INTO v_guest;

  RETURN jsonb_build_object('tableSession', to_jsonb(v_session), 'guestSession', to_jsonb(v_guest));
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_find_takeaway_session(
  p_public_token TEXT,
  p_guest_token TEXT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object('tableSession', to_jsonb(ts), 'guestSession', to_jsonb(gs))
  FROM public.table_qr_tokens AS qr
  JOIN public.table_sessions AS ts ON ts.table_id = qr.table_id
  JOIN public.guest_sessions AS gs ON gs.table_session_id = ts.id
  WHERE qr.public_token = p_public_token AND qr.is_active
    AND (qr.expires_at IS NULL OR qr.expires_at > now())
    AND ts.status = 'ACTIVE' AND ts.customer_name IS NOT NULL
    AND gs.session_token = p_guest_token
  ORDER BY ts.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.customer_get_session(
  p_session_id UUID,
  p_guest_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.table_sessions%ROWTYPE;
  v_table public.tables%ROWTYPE;
  v_public_token TEXT;
BEGIN
  SELECT * INTO v_session FROM public.table_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_session.merged_into_session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM public.table_sessions WHERE id = v_session.merged_into_session_id;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_sessions
    WHERE table_session_id = v_session.id AND session_token = p_guest_token
  ) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_table FROM public.tables WHERE id = v_session.table_id;
  SELECT public_token INTO v_public_token
  FROM public.table_qr_tokens
  WHERE table_id = v_table.id AND is_active
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY generated_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'tableSession', to_jsonb(v_session),
    'table', to_jsonb(v_table),
    'publicToken', v_public_token
  );
END;
$$;

-- Internal JSON builder; callers must pass the authorization checks below.
CREATE OR REPLACE FUNCTION public._customer_order_json(p_order_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT to_jsonb(o) || jsonb_build_object(
    'table_session', jsonb_build_object(
      'id', ts.id, 'customer_name', ts.customer_name,
      'table', jsonb_build_object('id', t.id, 'name', t.name)
    ),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(oi) || jsonb_build_object(
        'options', COALESCE((
          SELECT jsonb_agg(to_jsonb(oio)) FROM public.order_item_options AS oio
          WHERE oio.order_item_id = oi.id
        ), '[]'::jsonb)
      ) ORDER BY oi.created_at)
      FROM public.order_items AS oi WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM public.orders AS o
  JOIN public.table_sessions AS ts ON ts.id = o.table_session_id
  JOIN public.tables AS t ON t.id = ts.table_id
  WHERE o.id = p_order_id;
$$;

CREATE OR REPLACE FUNCTION public.customer_fetch_orders(
  p_session_id UUID,
  p_guest_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_sessions
    WHERE table_session_id = p_session_id AND session_token = p_guest_token
  ) THEN
    RAISE EXCEPTION 'Session not found or access denied' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(public._customer_order_json(o.id) ORDER BY o.created_at), '[]'::jsonb)
    FROM public.orders AS o WHERE o.table_session_id = p_session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_fetch_order(
  p_order_id UUID,
  p_guest_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders AS o
    JOIN public.guest_sessions AS gs ON gs.table_session_id = o.table_session_id
    WHERE o.id = p_order_id AND gs.session_token = p_guest_token
  ) THEN
    RETURN NULL;
  END IF;
  RETURN public._customer_order_json(p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_queue_positions(
  p_session_id UUID,
  p_guest_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_sessions
    WHERE table_session_id = p_session_id AND session_token = p_guest_token
  ) THEN
    RAISE EXCEPTION 'Session not found or access denied' USING ERRCODE = '42501';
  END IF;
  SELECT t.restaurant_id INTO v_restaurant_id
  FROM public.table_sessions AS ts
  JOIN public.tables AS t ON t.id = ts.table_id
  WHERE ts.id = p_session_id;
  RETURN jsonb_build_object(
    'totalActive', (
      SELECT count(*) FROM public.orders AS active_order
      JOIN public.table_sessions AS active_session ON active_session.id = active_order.table_session_id
      JOIN public.tables AS active_table ON active_table.id = active_session.table_id
      WHERE active_order.status <> 'SERVED' AND active_table.restaurant_id = v_restaurant_id
    ),
    'positions', COALESCE((
      SELECT jsonb_object_agg(o.id::text, (
        SELECT count(*) FROM public.orders AS prior
        JOIN public.table_sessions AS prior_session ON prior_session.id = prior.table_session_id
        JOIN public.tables AS prior_table ON prior_table.id = prior_session.table_id
        WHERE prior.status <> 'SERVED'
          AND prior_table.restaurant_id = v_restaurant_id
          AND (prior.created_at < o.created_at OR
               (prior.created_at = o.created_at AND prior.id < o.id))
      ))
      FROM public.orders AS o WHERE o.table_session_id = p_session_id
    ), '{}'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public._customer_order_json(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.customer_join_session(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_find_takeaway_session(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_get_session(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_fetch_orders(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_fetch_order(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_queue_positions(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_join_session(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_find_takeaway_session(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_get_session(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_fetch_orders(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_fetch_order(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_queue_positions(UUID, TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anon read sessions" ON public.table_sessions;
DROP POLICY IF EXISTS "Anon insert sessions" ON public.table_sessions;
DROP POLICY IF EXISTS "Anon read guests" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anon insert guests" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anon update guests" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anon read orders" ON public.orders;
DROP POLICY IF EXISTS "Anon read order items" ON public.order_items;
DROP POLICY IF EXISTS "Anon read order item options" ON public.order_item_options;
DROP POLICY IF EXISTS "Anon read bills" ON public.bills;
