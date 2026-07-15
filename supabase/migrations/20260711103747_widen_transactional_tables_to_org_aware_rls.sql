-- ============================================================
-- Widen transactional tables to org-aware access.
-- These tables have no company_id (data isn't per-company scoped
-- today - the company switcher is cosmetic), so we scope by
-- "does this row's owner share an active organization with me".
-- Additive only: existing auth.uid() = user_id policies are untouched.
--
-- NOTE: Already applied directly to the live Supabase project
-- (igarniqiyityfbtmaqpa) via the Supabase MCP tool, recorded as
-- migration version 20260711103747. This file is for committing
-- to supabase/migrations/ for history - do NOT re-run it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_mate(_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m1
    JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid() AND m1.status = 'active'
      AND m2.user_id = _user_id AND m2.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_mate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_mate(uuid) TO authenticated;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'customers','invoices','invoice_items','expenses','item_categories','items',
    'stock_movements','accounts','journal_entries','journal_lines','estimates',
    'estimate_items','recurring_invoices','credit_notes','payments','vendors',
    'bills','bill_items','bill_payments','purchase_orders','purchase_order_items',
    'bank_accounts','bank_transfers','bank_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_org_mate(user_id)) WITH CHECK (public.is_org_mate(user_id))',
      'org mates access ' || tbl, tbl
    );
  END LOOP;
END $$;
