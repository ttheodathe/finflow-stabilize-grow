-- Minimal PostgreSQL fixture for compiling and exercising the RLS policy migration.
-- This runs only inside an ephemeral GitHub Actions PostgreSQL service.
CREATE ROLE authenticated;
CREATE ROLE anon;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TYPE public.company_member_role AS ENUM ('owner','admin','accountant','hr','payroll','viewer');
CREATE TYPE public.org_member_role AS ENUM ('owner','member');

CREATE FUNCTION public.is_company_member(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT p_id = NULLIF(current_setting('test.company_id', true), '')::uuid
$$;
CREATE FUNCTION public.is_company_admin(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT p_id = NULLIF(current_setting('test.company_id', true), '')::uuid
    AND NULLIF(current_setting('test.company_role', true), '') IN ('owner','admin')
$$;
CREATE FUNCTION public.get_company_role(p_id uuid) RETURNS public.company_member_role
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_id = NULLIF(current_setting('test.company_id', true), '')::uuid
    THEN NULLIF(current_setting('test.company_role', true), '')::public.company_member_role
    ELSE NULL END
$$;
CREATE FUNCTION public.is_org_member(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT p_id = NULLIF(current_setting('test.organization_id', true), '')::uuid
$$;
CREATE FUNCTION public.is_org_admin(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT p_id = NULLIF(current_setting('test.organization_id', true), '')::uuid
    AND current_setting('test.org_admin', true) = 'true'
$$;
CREATE FUNCTION public.is_platform_staff() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('test.platform_staff', true) = 'true'
$$;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY, owner_id uuid
);
CREATE TABLE public.documents (id uuid PRIMARY KEY, company_id uuid);
CREATE TABLE public.companies (
  id uuid PRIMARY KEY, organization_id uuid
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'company_members','company_settings','company_tax_settings',
    'document_extractions','document_validations','organization_invitations',
    'organization_members','partner_payouts','partners','pay_runs',
    'payroll_statutory_contributions','payroll_tax_brackets',
    'payslip_contributions','payslip_line_items','payslips',
    'role_permissions','roles','tax_returns'
  ] LOOP
    EXECUTE format(
      'CREATE TABLE public.%I (
        id uuid PRIMARY KEY,
        company_id uuid,
        organization_id uuid,
        user_id uuid,
        role public.org_member_role,
        status text,
        email text,
        partner_id uuid,
        role_id uuid,
        document_id uuid,
        payslip_id uuid,
        owner_id uuid,
        description text
      )', t
    );
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','company_members','company_settings','company_tax_settings',
    'document_extractions','document_validations','organization_invitations',
    'organization_members','partner_payouts','partners','pay_runs',
    'payroll_statutory_contributions','payroll_tax_brackets',
    'payslip_contributions','payslip_line_items','payslips',
    'role_permissions','roles','tax_returns'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT SELECT ON auth.users TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth TO authenticated, anon;
