-- Minimal PostgreSQL fixture for compiling and exercising the RLS policy migration.
-- This runs only inside an ephemeral GitHub Actions PostgreSQL service.
CREATE ROLE authenticated;
CREATE ROLE anon;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE FUNCTION public.company_has_feature(p_company_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql STABLE
AS 'SELECT current_setting(''test.payroll_enabled'', true) = ''true''';


CREATE FUNCTION public.enforce_plan_feature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_feature text := TG_ARGV[0];
BEGIN
  IF NOT public.company_has_feature(NEW.company_id, v_feature) THEN
    RAISE EXCEPTION 'feature_locked: % requires an active eligible plan', v_feature
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;

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
        description text,
        approved_by uuid,
        approved_at timestamptz,
        total_gross numeric,
        total_employee_deductions numeric,
        total_net numeric,
        total_employer_contributions numeric,
        total_employer_cost numeric,
        journal_entry_id uuid,
        paid_at timestamptz,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
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

-- Baseline SELECT policies intentionally remain in place when the migration
-- consolidates write policies. UPDATE statements also require row visibility.
CREATE POLICY "tax returns view" ON public.tax_returns
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));
CREATE POLICY "hr roles select payslips" ON public.payslips
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));
CREATE POLICY "hr roles select payslip_contributions" ON public.payslip_contributions
  FOR SELECT TO authenticated
  USING (public.is_company_member((SELECT p.company_id FROM public.payslips p WHERE p.id=payslip_contributions.payslip_id)));
CREATE POLICY "hr roles select payslip_line_items" ON public.payslip_line_items
  FOR SELECT TO authenticated
  USING (public.is_company_member((SELECT p.company_id FROM public.payslips p WHERE p.id=payslip_line_items.payslip_id)));
CREATE POLICY "pay runs view" ON public.pay_runs
  FOR SELECT TO authenticated
  USING (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role,
      'hr'::public.company_member_role,
      'payroll'::public.company_member_role
    )
  );

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT SELECT ON auth.users TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth TO authenticated, anon;
