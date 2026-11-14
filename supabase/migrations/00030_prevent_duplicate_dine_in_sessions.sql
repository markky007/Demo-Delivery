-- Preserve multiple takeaway sessions while allowing only one active dine-in
-- session per table. The parent-row lock closes the read-then-insert race.
CREATE OR REPLACE FUNCTION public.enforce_single_active_dine_in_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_table_name TEXT;
BEGIN
  IF NEW.status <> 'ACTIVE' THEN RETURN NEW; END IF;

  SELECT name INTO v_table_name
  FROM public.tables
  WHERE id = NEW.table_id
  FOR UPDATE;
  IF v_table_name IS NULL THEN RETURN NEW; END IF;
  IF v_table_name ILIKE '%takeaway%' OR v_table_name LIKE '%กลับบ้าน%' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.table_sessions
    WHERE table_id = NEW.table_id AND status = 'ACTIVE' AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Table already has an active session' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS single_active_dine_in_session ON public.table_sessions;
CREATE TRIGGER single_active_dine_in_session
  BEFORE INSERT OR UPDATE OF table_id, status ON public.table_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_dine_in_session();
REVOKE EXECUTE ON FUNCTION public.enforce_single_active_dine_in_session() FROM PUBLIC, anon, authenticated;
