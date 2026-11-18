-- Server-side partner application submission boundary and IP rate limiting.
-- The app server uses Vercel's platform-overwritten x-forwarded-for value,
-- stores only an HMAC of the address, and submits via service-role-only RPCs.

CREATE TABLE IF NOT EXISTS public.partner_application_rate_limits (
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (ip_hash, window_start)
);

ALTER TABLE public.partner_application_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.partner_application_rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_partner_application_rate_limit(p_ip_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
  v_window timestamptz := pg_catalog.date_trunc('hour', pg_catalog.now());
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key';
  END IF;

  DELETE FROM public.partner_application_rate_limits
  WHERE window_start < pg_catalog.now() - interval '48 hours';

  INSERT INTO public.partner_application_rate_limits (ip_hash, window_start, request_count)
  VALUES (p_ip_hash, v_window, 1)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET request_count = public.partner_application_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= 5;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_partner_application_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_partner_application_rate_limit(text) TO service_role;

-- Server-only overload records the verified caller id without trusting client-supplied user ids.
CREATE OR REPLACE FUNCTION public.submit_partner_application_server(
  p_partner_type public.partner_type,
  p_business_name text,
  p_country text,
  p_contact_email text,
  p_terms_accepted boolean,
  p_website text DEFAULT NULL,
  p_industry text DEFAULT NULL,
  p_business_type text DEFAULT NULL,
  p_linkedin_url text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_monthly_audience text DEFAULT NULL,
  p_approx_clients text DEFAULT NULL,
  p_motivation text DEFAULT NULL,
  p_experience text DEFAULT NULL,
  p_marketing_channels text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_application_id uuid;
BEGIN
  IF p_terms_accepted IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Partner terms must be accepted';
  END IF;
  IF NULLIF(pg_catalog.btrim(p_business_name), '') IS NULL
     OR pg_catalog.length(pg_catalog.btrim(p_business_name)) > 200 THEN
    RAISE EXCEPTION 'Business name is required and must be at most 200 characters';
  END IF;
  IF NULLIF(pg_catalog.btrim(p_country), '') IS NULL
     OR pg_catalog.length(pg_catalog.btrim(p_country)) > 100 THEN
    RAISE EXCEPTION 'Country is required and must be at most 100 characters';
  END IF;
  IF NULLIF(pg_catalog.btrim(p_contact_email), '') IS NULL
     OR pg_catalog.length(pg_catalog.btrim(p_contact_email)) > 320
     OR p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid contact email is required';
  END IF;
  IF pg_catalog.length(COALESCE(p_website, '')) > 2048
     OR pg_catalog.length(COALESCE(p_linkedin_url, '')) > 2048
     OR pg_catalog.length(COALESCE(p_phone, '')) > 64
     OR pg_catalog.length(COALESCE(p_industry, '')) > 160
     OR pg_catalog.length(COALESCE(p_business_type, '')) > 160
     OR pg_catalog.length(COALESCE(p_monthly_audience, '')) > 160
     OR pg_catalog.length(COALESCE(p_approx_clients, '')) > 160
     OR pg_catalog.length(COALESCE(p_motivation, '')) > 5000
     OR pg_catalog.length(COALESCE(p_experience, '')) > 5000
     OR pg_catalog.cardinality(COALESCE(p_marketing_channels, ARRAY[]::text[])) > 20 THEN
    RAISE EXCEPTION 'One or more partner application fields exceed allowed limits';
  END IF;

  INSERT INTO public.partner_applications (
    user_id, status, partner_type, business_name, website, country, industry,
    business_type, linkedin_url, contact_email, phone, monthly_audience,
    approx_clients, motivation, experience, marketing_channels, terms_accepted,
    admin_notes, reviewed_by, reviewed_at, created_at, updated_at
  )
  VALUES (
    p_user_id, 'pending', p_partner_type, pg_catalog.btrim(p_business_name),
    NULLIF(pg_catalog.btrim(COALESCE(p_website, '')), ''),
    pg_catalog.btrim(p_country),
    NULLIF(pg_catalog.btrim(COALESCE(p_industry, '')), ''),
    NULLIF(pg_catalog.btrim(COALESCE(p_business_type, '')), ''),
    NULLIF(pg_catalog.btrim(COALESCE(p_linkedin_url, '')), ''),
    pg_catalog.lower(pg_catalog.btrim(p_contact_email)),
    NULLIF(pg_catalog.btrim(COALESCE(p_phone, '')), ''),
    NULLIF(pg_catalog.btrim(COALESCE(p_monthly_audience, '')), ''),
    NULLIF(pg_catalog.btrim(COALESCE(p_approx_clients, '')), ''),
    NULLIF(pg_catalog.btrim(COALESCE(p_motivation, '')), ''),
    NULLIF(pg_catalog.btrim(COALESCE(p_experience, '')), ''),
    p_marketing_channels, TRUE, NULL, NULL, NULL, pg_catalog.now(), pg_catalog.now()
  )
  RETURNING id INTO v_application_id;

  RETURN v_application_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_partner_application_server(
  public.partner_type, text, text, text, boolean, text, text, text, text, text,
  text, text, text, text, text[], uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_application_server(
  public.partner_type, text, text, text, boolean, text, text, text, text, text,
  text, text, text, text, text[], uuid
) TO service_role;

-- Legacy anonymous execution is revoked only after the new app route is deployed.
