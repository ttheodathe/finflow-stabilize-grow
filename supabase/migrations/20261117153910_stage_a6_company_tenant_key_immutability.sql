-- Stage A.6: prevent authenticated clients from reassigning tenant-owned rows.
-- A row must remain in the company that originally created it; membership in two
-- companies must not permit moving accounting or operational history between them.

CREATE OR REPLACE FUNCTION public.prevent_company_id_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'A record cannot be reassigned to another company'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_company_id_reassignment() FROM PUBLIC, anon, authenticated;

DO $migration$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND EXISTS (
         SELECT 1
           FROM information_schema.columns col
          WHERE col.table_schema = 'public'
            AND col.table_name = c.relname
            AND col.column_name = 'company_id'
       )
  LOOP
    EXECUTE pg_catalog.format(
      'DROP TRIGGER IF EXISTS zz_prevent_company_id_reassignment ON public.%I',
      v_table.relname
    );
    EXECUTE pg_catalog.format(
      'CREATE TRIGGER zz_prevent_company_id_reassignment
       BEFORE UPDATE ON public.%I
       FOR EACH ROW
       EXECUTE FUNCTION public.prevent_company_id_reassignment()',
      v_table.relname
    );
  END LOOP;
END;
$migration$;

-- Public submissions return only an opaque application ID; anonymous table reads are unnecessary.
REVOKE ALL ON TABLE public.partner_applications FROM PUBLIC, anon;
