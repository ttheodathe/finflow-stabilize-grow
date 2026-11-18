DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TYPE public.partner_type AS ENUM (
  'affiliate','bookkeeping_firm','accounting_firm','accountant',
  'tax_consultant','educator','influencer','reseller'
);

CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  partner_type public.partner_type NOT NULL,
  business_name text NOT NULL,
  website text,
  country text NOT NULL,
  industry text,
  business_type text,
  linkedin_url text,
  contact_email text NOT NULL,
  phone text,
  monthly_audience text,
  approx_clients text,
  motivation text,
  experience text,
  marketing_channels text[],
  terms_accepted boolean NOT NULL,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX partner_applications_one_pending_per_email
  ON public.partner_applications (lower(contact_email))
  WHERE status='pending' AND contact_email IS NOT NULL;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULL::uuid $$;
