-- Isolated fixture for the partner approval RPC migration.
CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TYPE public.partner_type AS ENUM ('referral');
CREATE TYPE public.partner_application_status AS ENUM (
  'pending', 'approved', 'rejected', 'needs_more_info'
);

CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  status public.partner_application_status NOT NULL DEFAULT 'pending',
  partner_type public.partner_type NOT NULL,
  business_name text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  application_id uuid,
  partner_type public.partner_type NOT NULL,
  business_name text NOT NULL,
  referral_code text NOT NULL UNIQUE,
  commission_rate numeric NOT NULL,
  created_by uuid
);

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
     AND current_setting('test.is_platform_staff', true) = 'true';
$$;

CREATE OR REPLACE FUNCTION public.generate_partner_referral_code(p_business_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'test-' || left(md5(coalesce(p_business_name, 'partner')), 12);
$$;
