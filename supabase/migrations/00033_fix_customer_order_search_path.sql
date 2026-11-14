-- create_order_verified runs with an empty search_path. The existing order
-- writer uses unqualified table and helper names, so it needs its own fixed
-- path when called from that verified entry point.
ALTER FUNCTION public.create_order(UUID, TEXT, JSONB)
  SET search_path = pg_catalog, public, pg_temp;
