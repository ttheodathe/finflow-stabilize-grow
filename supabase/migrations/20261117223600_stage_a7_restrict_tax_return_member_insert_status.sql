-- Stage A.7: non-admin members may only create tax returns in draft state.
-- Status transitions are reserved for the separate company-admin policy.
ALTER POLICY "company members insert"
ON public.tax_returns
WITH CHECK (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) <> 'viewer'::public.company_member_role
  AND status = 'draft'
);
