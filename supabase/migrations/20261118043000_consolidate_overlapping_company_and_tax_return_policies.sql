-- Consolidate two pairs of permissive RLS policies without changing access semantics.
-- The original policies were OR-combined by PostgreSQL; these expressions preserve that behavior.

-- Company visibility: either an active company member or an active organization member.
DROP POLICY IF EXISTS "company members view companies" ON public.companies;
DROP POLICY IF EXISTS "org members view companies" ON public.companies;
CREATE POLICY "company and organization members view companies"
ON public.companies
FOR SELECT
TO public
USING (
  public.is_company_member(id)
  OR public.is_org_member(organization_id)
);

-- Tax-return updates: admins may update any status; non-viewer company members
-- may update draft rows only. Keep USING and WITH CHECK logically identical.
DROP POLICY IF EXISTS "company admins update any status" ON public.tax_returns;
DROP POLICY IF EXISTS "company members update draft" ON public.tax_returns;
CREATE POLICY "company admins or members update tax returns"
ON public.tax_returns
FOR UPDATE
TO public
USING (
  public.is_company_admin(company_id)
  OR (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer'::public.company_member_role
    AND status = 'draft'
  )
)
WITH CHECK (
  public.is_company_admin(company_id)
  OR (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) <> 'viewer'::public.company_member_role
    AND status = 'draft'
  )
);
