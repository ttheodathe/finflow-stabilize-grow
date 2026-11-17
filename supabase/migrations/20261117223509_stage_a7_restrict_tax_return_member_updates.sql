-- Stage A.7: keep non-admin tax-return updates in draft state.
-- The USING clause already limited ordinary members to draft rows, but the
-- prior WITH CHECK allowed those rows to be changed to submitted/accepted/etc.
-- Admins retain their separate policy for status updates across all states.
ALTER POLICY "company members update draft"
ON public.tax_returns
WITH CHECK (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) <> 'viewer'::public.company_member_role
  AND status = 'draft'
);
