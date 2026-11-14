-- Run on a disposable staging database after applying migrations 00026-00033.
-- These assertions do not write application data.
DO $test$
DECLARE
  v_signature TEXT;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.owner_update_order_item_price(uuid,integer,integer,text)',
    'public.kitchen_update_order(uuid,jsonb)',
    'public.set_order_items_completed(uuid[],boolean)',
    'public.advance_order_status(uuid,public.order_status)',
    'public.delete_order_and_session(uuid)',
    'public.delete_table_session_cascade(uuid)',
    'public.get_order_history(uuid)',
    'public.create_order(uuid,text,jsonb)'
  ] LOOP
    IF has_function_privilege('anon', v_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can execute %', v_signature;
    END IF;
  END LOOP;

  IF has_function_privilege('authenticated', 'public.create_order(uuid,text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can bypass QR verification through create_order';
  END IF;

  IF NOT has_function_privilege('anon', 'public.create_order_verified(uuid,text,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Customer order entry RPC is not executable by anon';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc AS p
    CROSS JOIN LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS cfg(setting)
    WHERE p.oid = 'public.create_order(uuid,text,jsonb)'::regprocedure
      AND split_part(setting, '=', 1) = 'search_path'
      AND replace(split_part(setting, '=', 2), ' ', '') = 'pg_catalog,public,pg_temp'
  ) THEN
    RAISE EXCEPTION 'create_order must resolve its legacy unqualified names when called by create_order_verified';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'table_qr_tokens', 'table_sessions', 'guest_sessions', 'orders',
        'order_items', 'order_item_options', 'order_histories', 'bills'
      )
      AND (policyname LIKE 'Anon %' OR policyname = 'Allow public read access to order_histories')
  ) THEN
    RAISE EXCEPTION 'Legacy anonymous data policy still exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid IN (
      'public.owner_update_order_item_price(uuid,integer,integer,text)'::regprocedure,
      'public.kitchen_update_order(uuid,jsonb)'::regprocedure,
      'public.set_order_items_completed(uuid[],boolean)'::regprocedure
    ) AND prosecdef
  ) THEN
    RAISE EXCEPTION 'Owner operation still bypasses caller RLS';
  END IF;
END;
$test$;
