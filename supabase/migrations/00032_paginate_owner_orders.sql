-- Filter and page before expanding nested order items. Counts cover the full
-- date range, while rows contain only the requested page.
CREATE OR REPLACE FUNCTION public.owner_list_orders(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_table_filter TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'CREATED_DESC',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;

  WITH date_scope AS (
    SELECT o.* FROM public.orders AS o
    WHERE (p_start IS NULL OR o.created_at >= p_start)
      AND (p_end IS NULL OR o.created_at <= p_end)
  ),
  filtered AS (
    SELECT o.id, o.created_at, o.queue_number, o.total_amount
    FROM date_scope AS o
    JOIN public.table_sessions AS ts ON ts.id = o.table_session_id
    JOIN public.tables AS t ON t.id = ts.table_id
    WHERE (p_status IS NULL OR p_status = 'ALL' OR o.status::text = p_status)
      AND (
        p_table_filter IS NULL OR p_table_filter = 'ALL'
        OR (p_table_filter = 'DINE_IN' AND ts.customer_name IS NULL)
        OR (p_table_filter = 'TAKEAWAY' AND ts.customer_name IS NOT NULL)
        OR (p_table_filter LIKE 'TABLE_%' AND t.id::text = substr(p_table_filter, 7))
      )
      AND (
        nullif(btrim(p_search), '') IS NULL
        OR o.queue_number::text ILIKE '%' || ltrim(btrim(p_search), '#') || '%'
        OR t.name ILIKE '%' || btrim(p_search) || '%'
        OR ts.customer_name ILIKE '%' || btrim(p_search) || '%'
        OR o.id::text ILIKE '%' || btrim(p_search) || '%'
        OR EXISTS (
          SELECT 1 FROM public.order_items AS oi
          WHERE oi.order_id = o.id
            AND (oi.snapshot_name ILIKE '%' || btrim(p_search) || '%'
              OR oi.special_instruction ILIKE '%' || btrim(p_search) || '%')
        )
      )
  ),
  paged AS (
    SELECT f.id,
      row_number() OVER (ORDER BY
        CASE WHEN p_sort = 'CREATED_ASC' THEN f.created_at END ASC NULLS LAST,
        CASE WHEN p_sort = 'QUEUE_ASC' THEN f.queue_number END ASC NULLS LAST,
        CASE WHEN p_sort = 'QUEUE_DESC' THEN f.queue_number END DESC NULLS LAST,
        CASE WHEN p_sort = 'AMOUNT_DESC' THEN f.total_amount END DESC NULLS LAST,
        f.created_at DESC, f.id
      ) AS sort_index
    FROM filtered AS f
    ORDER BY
      CASE WHEN p_sort = 'CREATED_ASC' THEN f.created_at END ASC NULLS LAST,
      CASE WHEN p_sort = 'QUEUE_ASC' THEN f.queue_number END ASC NULLS LAST,
      CASE WHEN p_sort = 'QUEUE_DESC' THEN f.queue_number END DESC NULLS LAST,
      CASE WHEN p_sort = 'AMOUNT_DESC' THEN f.total_amount END DESC NULLS LAST,
      f.created_at DESC, f.id
    LIMIT greatest(1, least(coalesce(p_page_size, 30), 100))
    OFFSET (greatest(1, coalesce(p_page, 1)) - 1) * greatest(1, least(coalesce(p_page_size, 30), 100))
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'filteredRevenue', (SELECT coalesce(sum(total_amount), 0) FROM filtered),
    'metrics', (
      SELECT jsonb_build_object(
        'ALL', count(*),
        'QUEUED', count(*) FILTER (WHERE status = 'QUEUED'),
        'PREPARING', count(*) FILTER (WHERE status = 'PREPARING'),
        'PREPARED', count(*) FILTER (WHERE status = 'PREPARED'),
        'SERVED', count(*) FILTER (WHERE status = 'SERVED'),
        'totalRevenue', coalesce(sum(total_amount), 0)
      ) FROM date_scope
    ),
    'orders', coalesce((
      SELECT jsonb_agg(
        to_jsonb(o) || jsonb_build_object(
          'table_session', jsonb_build_object(
            'id', ts.id, 'status', ts.status, 'customer_name', ts.customer_name,
            'created_at', ts.created_at, 'closed_at', ts.closed_at,
            'table', jsonb_build_object('id', t.id, 'name', t.name)
          ),
          'items', coalesce((
            SELECT jsonb_agg(to_jsonb(oi) || jsonb_build_object(
              'options', coalesce((
                SELECT jsonb_agg(to_jsonb(oio)) FROM public.order_item_options AS oio
                WHERE oio.order_item_id = oi.id
              ), '[]'::jsonb)
            ) ORDER BY oi.created_at)
            FROM public.order_items AS oi WHERE oi.order_id = o.id
          ), '[]'::jsonb)
        ) ORDER BY p.sort_index
      )
      FROM paged AS p
      JOIN public.orders AS o ON o.id = p.id
      JOIN public.table_sessions AS ts ON ts.id = o.table_session_id
      JOIN public.tables AS t ON t.id = ts.table_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_list_orders(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_list_orders(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;
