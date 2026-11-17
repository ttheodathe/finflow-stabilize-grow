-- Repair duplicate qualification introduced by a repeated pg_trgm relocation migration.
-- This migration is idempotent and changes function definitions only; no rows are changed.

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
    definition := replace(
      definition,
      'extensions.extensions.similarity(',
      'extensions.similarity('
    );

    IF position('extensions.extensions.similarity(' IN definition) > 0 THEN
      RAISE EXCEPTION 'Duplicate pg_trgm schema qualification remains in %', f;
    END IF;

    EXECUTE definition;
  END LOOP;
END;
$$;

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
    IF position('extensions.extensions.similarity(' IN definition) > 0 THEN
      RAISE EXCEPTION 'Post-deployment verification failed for %', f;
    END IF;
    IF position('extensions.similarity(' IN definition) = 0 THEN
      RAISE EXCEPTION 'Expected extensions.similarity call missing in %', f;
    END IF;
  END LOOP;
END;
$$;
