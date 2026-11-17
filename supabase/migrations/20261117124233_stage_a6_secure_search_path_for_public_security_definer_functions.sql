-- Stage A.6: prevent temporary-schema object shadowing in SECURITY DEFINER routines.
-- public is not writable by anon/authenticated, and pg_temp is explicitly last.
DO $migration$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public']
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp',
      v_function
    );
  END LOOP;
END;
$migration$;
