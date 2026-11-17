-- Keep pg_trgm outside the exposed public API schema.
-- Two PL/pgSQL functions use similarity(); qualify those calls before/after relocation.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

DO $$
DECLARE
  f regprocedure;
  definition text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.match_or_create_vendor(uuid,uuid,text)'::regprocedure,
    'public.ai_process_bank_transaction(uuid)'::regprocedure
  ]
  LOOP
    definition := pg_get_functiondef(f);
    definition := replace(definition, 'similarity(', 'extensions.similarity(');
    EXECUTE definition;
  END LOOP;
END;
$$;
