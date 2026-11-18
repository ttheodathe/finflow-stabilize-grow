\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE
  i integer;
  allowed boolean;
BEGIN
  FOR i IN 1..5 LOOP
    allowed := public.consume_partner_application_rate_limit(pg_catalog.repeat('a', 64));
    IF allowed IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'request % was unexpectedly blocked', i;
    END IF;
  END LOOP;
  allowed := public.consume_partner_application_rate_limit(pg_catalog.repeat('a', 64));
  IF allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'sixth request was not rate limited';
  END IF;
END;
$$;

SELECT public.submit_partner_application_server(
  'affiliate'::public.partner_type,
  'CI Email Validation',
  'Rwanda',
  'Applicant+CI@Example.com',
  TRUE,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  '00000000-0000-0000-0000-000000000123'::uuid
) AS valid_id \gset
RESET ROLE;
SELECT set_config('request.test.valid_id', :'valid_id', true);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_applications
    WHERE id = current_setting('request.test.valid_id')::uuid
      AND contact_email = 'applicant+ci@example.com'
      AND status = 'pending'
      AND user_id = '00000000-0000-0000-0000-000000000123'::uuid
  ) THEN
    RAISE EXCEPTION 'valid email or verified user id was not stored';
  END IF;
END;
$$;

SET LOCAL ROLE anon;
DO $
BEGIN
  IF NOT pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy public submission path was disabled before the new app is deployed';
  END IF;
  IF pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application_server(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[],uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'server submission RPC is executable by anon';
  END IF;
  IF pg_catalog.has_function_privilege(current_user,
    'public.consume_partner_application_rate_limit(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'rate-limit RPC is executable by anon';
  END IF;
END;
$;
ROLLBACK;
SELECT 'partner application rate-limit and email validation tests passed' AS result;
