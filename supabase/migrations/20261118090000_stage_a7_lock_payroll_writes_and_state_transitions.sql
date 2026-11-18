-- Prevent authenticated users from bypassing atomic payroll generation,
-- modifying generated payslips, or marking a pay run paid without ledger posting.
BEGIN;

DROP POLICY IF EXISTS "payroll roles insert pay_runs" ON public.pay_runs;
DROP POLICY IF EXISTS "payroll roles delete pay_runs" ON public.pay_runs;
DROP POLICY IF EXISTS "hr roles write pay_runs" ON public.pay_runs;

DROP POLICY IF EXISTS "payroll roles insert payslips" ON public.payslips;
DROP POLICY IF EXISTS "payroll roles update payslips" ON public.payslips;
DROP POLICY IF EXISTS "payroll roles delete payslips" ON public.payslips;
DROP POLICY IF EXISTS "hr roles write payslips" ON public.payslips;

DROP POLICY IF EXISTS "payroll roles insert payslip contributions" ON public.payslip_contributions;
DROP POLICY IF EXISTS "payroll roles update payslip contributions" ON public.payslip_contributions;
DROP POLICY IF EXISTS "payroll roles delete payslip contributions" ON public.payslip_contributions;
DROP POLICY IF EXISTS "hr roles write payslip_contributions" ON public.payslip_contributions;

DROP POLICY IF EXISTS "payroll roles insert payslip line items" ON public.payslip_line_items;
DROP POLICY IF EXISTS "payroll roles update payslip line items" ON public.payslip_line_items;
DROP POLICY IF EXISTS "payroll roles delete payslip line items" ON public.payslip_line_items;
DROP POLICY IF EXISTS "hr roles write payslip_line_items" ON public.payslip_line_items;

-- Only the service-owned atomic RPC may create pay runs or generated payslip data.
-- The UI still needs to approve/cancel pay runs; grant only those three columns.
REVOKE INSERT, UPDATE, DELETE ON public.pay_runs FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, approved_by, approved_at) ON public.pay_runs TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.payslips,
  public.payslip_contributions, public.payslip_line_items
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_pay_run_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.period_start IS DISTINCT FROM OLD.period_start
     OR NEW.period_end IS DISTINCT FROM OLD.period_end
     OR NEW.pay_date IS DISTINCT FROM OLD.pay_date
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.total_gross IS DISTINCT FROM OLD.total_gross
     OR NEW.total_employee_deductions IS DISTINCT FROM OLD.total_employee_deductions
     OR NEW.total_net IS DISTINCT FROM OLD.total_net
     OR NEW.total_employer_contributions IS DISTINCT FROM OLD.total_employer_contributions
     OR NEW.total_employer_cost IS DISTINCT FROM OLD.total_employer_cost
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Pay-run identity, period, and financial totals are immutable after generation'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'draft' AND NEW.status = 'approved' THEN
      IF auth.uid() IS NULL
         OR OLD.approved_by IS NOT NULL
         OR OLD.approved_at IS NOT NULL
         OR OLD.journal_entry_id IS NOT NULL
         OR OLD.paid_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pay run cannot be approved from its current state'
          USING ERRCODE = '42501';
      END IF;
      NEW.approved_by := auth.uid();
      NEW.approved_at := pg_catalog.now();
    ELSIF OLD.status IN ('draft','approved') AND NEW.status = 'cancelled' THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to cancel a pay run'
          USING ERRCODE = '42501';
      END IF;
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
      NEW.journal_entry_id := OLD.journal_entry_id;
      NEW.paid_at := OLD.paid_at;
    ELSIF OLD.status = 'approved' AND NEW.status = 'paid' THEN
      IF pg_catalog.current_setting('app.payroll_posting', true) IS DISTINCT FROM 'true'
         OR NEW.journal_entry_id IS NULL
         OR NEW.paid_at IS NULL
         OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NOT EXISTS (
           SELECT 1
           FROM public.journal_entries j
           WHERE j.id = NEW.journal_entry_id
             AND j.company_id = OLD.company_id
             AND j.source_type = 'payroll'
             AND j.source_id = OLD.id
             AND j.is_posted = true
         )
         OR NOT EXISTS (
           SELECT 1
           FROM public.journal_lines jl
           WHERE jl.entry_id = NEW.journal_entry_id
         )
         OR (
           SELECT pg_catalog.round(pg_catalog.coalesce(pg_catalog.sum(jl.debit), 0), 2)
                = pg_catalog.round(pg_catalog.coalesce(pg_catalog.sum(jl.credit), 0), 2)
           FROM public.journal_lines jl
           WHERE jl.entry_id = NEW.journal_entry_id
         ) IS NOT TRUE THEN
        RAISE EXCEPTION 'A pay run can be marked paid only by a balanced posted payroll journal entry'
          USING ERRCODE = '42501';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid pay-run status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'Approval and posting metadata can change only with a valid status transition'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.notes IS DISTINCT FROM OLD.notes AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Pay-run notes are immutable after approval'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_pay_run_state_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_enforce_pay_run_state_transition ON public.pay_runs;
CREATE TRIGGER a_enforce_pay_run_state_transition
BEFORE UPDATE ON public.pay_runs
FOR EACH ROW EXECUTE FUNCTION public.enforce_pay_run_state_transition();

CREATE OR REPLACE FUNCTION public.post_payrun_to_ledger(p_pay_run_id uuid, p_salary_expense_account_id uuid, p_employer_tax_expense_account_id uuid, p_statutory_payable_account_id uuid, p_bank_account_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_run public.pay_runs%ROWTYPE;
  v_uid uuid := auth.uid();
  v_total_gross numeric;
  v_employer_contrib numeric;
  v_statutory_liability numeric;
  v_total_net numeric;
  v_entry_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_run
    FROM public.pay_runs
   WHERE id = p_pay_run_id
   FOR UPDATE;

  IF NOT FOUND OR v_run.status <> 'approved' OR v_run.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pay run is not approved or has already been posted';
  END IF;

  IF NOT public.is_company_member(v_run.company_id)
     OR public.get_company_role(v_run.company_id) NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role,
       'payroll'::public.company_member_role
     ) THEN
    RAISE EXCEPTION 'Only company owners, admins, or payroll-role members may post payroll';
  END IF;

  v_total_gross := COALESCE(v_run.total_gross, 0);
  v_employer_contrib := COALESCE(v_run.total_employer_contributions, 0);
  v_statutory_liability := COALESCE(v_run.total_employee_deductions, 0) + v_employer_contrib;
  v_total_net := COALESCE(v_run.total_net, 0);

  IF v_total_gross < 0 OR v_run.total_employee_deductions < 0
     OR v_employer_contrib < 0 OR v_statutory_liability < 0 OR v_total_net < 0
     OR v_total_gross + v_employer_contrib <= 0
     OR pg_catalog.round(v_total_gross + v_employer_contrib, 2)
        <> pg_catalog.round(v_statutory_liability + v_total_net, 2) THEN
    RAISE EXCEPTION 'Pay run totals are invalid or do not balance';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = p_salary_expense_account_id
       AND a.company_id = v_run.company_id AND a.is_active AND a.type = 'expense'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = p_employer_tax_expense_account_id
       AND a.company_id = v_run.company_id AND a.is_active AND a.type = 'expense'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = p_statutory_payable_account_id
       AND a.company_id = v_run.company_id AND a.is_active AND a.type = 'liability'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = p_bank_account_id
       AND a.company_id = v_run.company_id AND a.is_active AND a.type = 'asset'
  ) THEN
    RAISE EXCEPTION 'Payroll accounts must be active, company-owned, and have the correct account types';
  END IF;

  INSERT INTO public.journal_entries (
    company_id, user_id, entry_date, reference, memo, source_type, source_id, is_posted
  )
  VALUES (
    v_run.company_id, v_uid, v_run.pay_date,
    'PAYRUN-' || pg_catalog.left(v_run.id::text, 8),
    'Payroll for ' || v_run.period_start::text || ' to ' || v_run.period_end::text,
    'payroll', v_run.id, false
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines (
    company_id, user_id, entry_id, account_id, debit, credit, description
  )
  SELECT v_run.company_id, v_uid, v_entry_id, x.account_id, x.debit, x.credit, x.description
  FROM (VALUES
    (p_salary_expense_account_id, v_total_gross, 0::numeric, 'Payroll: gross wages'),
    (p_employer_tax_expense_account_id, v_employer_contrib, 0::numeric, 'Payroll: employer statutory contributions'),
    (p_statutory_payable_account_id, 0::numeric, v_statutory_liability, 'Payroll: PAYE + statutory contributions payable'),
    (p_bank_account_id, 0::numeric, v_total_net, 'Payroll: net pay disbursed')
  ) AS x(account_id, debit, credit, description)
  WHERE x.debit > 0 OR x.credit > 0;

  UPDATE public.journal_entries
     SET is_posted = true
   WHERE id = v_entry_id;

  PERFORM pg_catalog.set_config('app.payroll_posting', 'true', true);

  UPDATE public.pay_runs
     SET status = 'paid',
         paid_at = pg_catalog.now(),
         journal_entry_id = v_entry_id
   WHERE id = v_run.id
     AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pay run state changed before posting completed';
  END IF;

  INSERT INTO public.audit_logs (
    company_id, user_id, action, entity_type, entity_id, metadata
  )
  VALUES (
    v_run.company_id, v_uid, 'pay_run_posted', 'pay_runs', v_run.id,
    pg_catalog.jsonb_build_object(
      'journal_entry_id', v_entry_id,
      'total_net', v_total_net,
      'total_gross', v_total_gross
    )
  );

  RETURN v_entry_id;
END;
$function$


REVOKE ALL ON FUNCTION public.post_payrun_to_ledger(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_payrun_to_ledger(uuid,uuid,uuid,uuid,uuid) TO authenticated;

COMMIT;
