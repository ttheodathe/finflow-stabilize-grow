\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy partner submission RPC remains executable by anon';
  END IF;
  IF pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application_server(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[],uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'server-only partner submission RPC is executable by anon';
  END IF;
  IF pg_catalog.has_function_privilege(current_user,
    'public.consume_partner_application_rate_limit(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'rate-limit function is executable by anon';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy partner submission RPC remains executable by authenticated';
  END IF;
END;
$$;

SET LOCAL ROLE service_role;
DO $$
BEGIN
  IF NOT pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'service role lost legacy RPC execution';
  END IF;
  IF NOT pg_catalog.has_function_privilege(current_user,
    'public.submit_partner_application_server(public.partner_type,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text[],uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service role cannot execute server submission RPC';
  END IF;
  IF NOT pg_catalog.has_function_privilege(current_user,
    'public.consume_partner_application_rate_limit(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service role cannot execute rate-limit function';
  END IF;
END;
$$;

ROLLBACK;
SELECT 'legacy partner RPC revocation tests passed' AS result;
