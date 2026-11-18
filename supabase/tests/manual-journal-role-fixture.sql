CREATE TYPE public.company_member_role AS ENUM
  ('owner','admin','accountant','sales','inventory','hr','payroll','viewer');

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  reference text,
  memo text,
  source_type text,
  source_id uuid,
  is_posted boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  voided_by uuid,
  reverses_entry_id uuid,
  reversed_by_entry_id uuid
);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id),
  account_id uuid NOT NULL,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  description text
);

CREATE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT auth.uid() IS NOT NULL $$;

CREATE FUNCTION public.get_company_role(p_company_id uuid)
RETURNS public.company_member_role LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT NULLIF(current_setting('request.test_role', true), '')::public.company_member_role $$;

CREATE FUNCTION public.is_company_admin(p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT public.get_company_role(p_company_id) IN ('owner','admin') $$;

CREATE FUNCTION public.assert_journal_entry_balanced(p_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $ BEGIN RETURN; END; $;

GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid) TO authenticated;

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members insert" ON public.journal_entries
  FOR INSERT TO public
  WITH CHECK (public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer');
CREATE POLICY "company members update" ON public.journal_entries
  FOR UPDATE TO public
  USING (public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer')
  WITH CHECK (public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer');
CREATE POLICY "company members select" ON public.journal_entries
  FOR SELECT TO public USING (public.is_company_member(company_id));
CREATE POLICY "company admins delete" ON public.journal_entries
  FOR DELETE TO public USING (public.is_company_admin(company_id));

CREATE POLICY "company members insert" ON public.journal_lines
  FOR INSERT TO public
  WITH CHECK (public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer');
CREATE POLICY "company members update" ON public.journal_lines
  FOR UPDATE TO public
  USING (public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer')
  WITH CHECK (public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer');
CREATE POLICY "company members select" ON public.journal_lines
  FOR SELECT TO public USING (public.is_company_member(company_id));
CREATE POLICY "company admins delete" ON public.journal_lines
  FOR DELETE TO public USING (public.is_company_admin(company_id));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.journal_entries,public.journal_lines TO authenticated;
