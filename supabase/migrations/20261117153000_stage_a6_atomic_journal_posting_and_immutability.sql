-- Stage A.6: enforce balanced, tenant-scoped, immutable posted journal entries.
-- Manual journals and payroll now create drafts, add lines, then post; system
-- SECURITY DEFINER posting flows remain atomic within their existing transaction.

CREATE OR REPLACE FUNCTION public.assert_journal_entry_balanced(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_entry public.journal_entries%ROWTYPE;
  v_line_count integer;
  v_invalid_lines integer;
  v_debits numeric;
  v_credits numeric;
BEGIN
  SELECT * INTO v_entry
    FROM public.journal_entries
   WHERE id = p_entry_id;

  IF NOT FOUND OR NOT v_entry.is_posted THEN
    RETURN;
  END IF;

  SELECT
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (
      WHERE jl.company_id IS DISTINCT FROM v_entry.company_id
         OR jl.user_id IS DISTINCT FROM v_entry.user_id
         OR a.company_id IS DISTINCT FROM v_entry.company_id
    ),
    COALESCE(pg_catalog.sum(jl.debit), 0),
    COALESCE(pg_catalog.sum(jl.credit), 0)
  INTO v_line_count, v_invalid_lines, v_debits, v_credits
  FROM public.journal_lines jl
  LEFT JOIN public.accounts a ON a.id = jl.account_id
  WHERE jl.entry_id = p_entry_id;

  IF v_line_count < 2
     OR v_invalid_lines > 0
     OR v_debits <= 0
     OR pg_catalog.round(v_debits, 2) <> pg_catalog.round(v_credits, 2) THEN
    RAISE EXCEPTION 'Journal entry % is invalid: posted entries require at least two tenant-owned lines and equal positive debits and credits', p_entry_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_journal_entry_balanced(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_journal_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_entry_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entry_id := OLD.entry_id;
  ELSE
    v_entry_id := NEW.entry_id;
  END IF;

  PERFORM public.assert_journal_entry_balanced(v_entry_id);
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_journal_entry_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  PERFORM public.assert_journal_entry_balanced(NEW.id);
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_journal_balance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_journal_entry_balance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS journal_entries_balance_check ON public.journal_entries;
CREATE CONSTRAINT TRIGGER journal_entries_balance_check
AFTER INSERT OR UPDATE ON public.journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_journal_entry_balance();

-- Prevent authenticated clients from editing or deleting posted entries.
-- Draft entries remain editable until they are posted.
CREATE OR REPLACE FUNCTION public.guard_posted_journal_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND OLD.is_posted THEN
    RAISE EXCEPTION 'Posted journal entries are immutable; create a reversing entry instead';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_posted_journal_line_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
  v_posted boolean;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    SELECT je.is_posted INTO v_posted
      FROM public.journal_entries je
     WHERE je.id = OLD.entry_id;
    IF COALESCE(v_posted, false) THEN
      RAISE EXCEPTION 'Lines of posted journal entries are immutable';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT je.is_posted INTO v_posted
      FROM public.journal_entries je
     WHERE je.id = NEW.entry_id;
    IF COALESCE(v_posted, false) THEN
      RAISE EXCEPTION 'Lines can only be added to draft journal entries';
    END IF;
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_posted_journal_entry_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_posted_journal_line_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_posted_journal_entry_mutation ON public.journal_entries;
CREATE TRIGGER trg_guard_posted_journal_entry_mutation
BEFORE UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.guard_posted_journal_entry_mutation();

DROP TRIGGER IF EXISTS trg_guard_posted_journal_line_mutation ON public.journal_lines;
CREATE TRIGGER trg_guard_posted_journal_line_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW
EXECUTE FUNCTION public.guard_posted_journal_line_mutation();

-- Atomic manual-entry reversal. Automated/source-driven entries are reversed
-- through their originating business workflow, not from the manual journal UI.
CREATE OR REPLACE FUNCTION public.void_manual_journal_entry(p_entry_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_entry public.journal_entries%ROWTYPE;
  v_reversal_id uuid;
  v_line_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_entry
    FROM public.journal_entries
   WHERE id = p_entry_id
   FOR UPDATE;

  IF NOT FOUND OR NOT v_entry.is_posted OR v_entry.source_type <> 'manual'
     OR v_entry.voided_at IS NOT NULL
     OR v_entry.reversed_by_entry_id IS NOT NULL
     OR v_entry.reverses_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only an active posted manual journal entry can be voided';
  END IF;

  IF NOT public.is_company_member(v_entry.company_id)
     OR public.get_company_role(v_entry.company_id) = 'viewer'::public.company_member_role THEN
    RAISE EXCEPTION 'Not permitted to void this journal entry';
  END IF;

  PERFORM public.assert_journal_entry_balanced(v_entry.id);

  SELECT pg_catalog.count(*) INTO v_line_count
    FROM public.journal_lines
   WHERE entry_id = v_entry.id;

  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Journal entry has no valid lines to reverse';
  END IF;

  INSERT INTO public.journal_entries (
    company_id, user_id, entry_date, reference, memo, source_type,
    reverses_entry_id, is_posted
  )
  VALUES (
    v_entry.company_id, auth.uid(), pg_catalog.current_date,
    CASE WHEN v_entry.reference IS NULL THEN NULL ELSE v_entry.reference || '-VOID' END,
    'Reversal of ' || COALESCE(v_entry.reference, v_entry.id::text)
      || CASE WHEN v_entry.memo IS NULL THEN '' ELSE ': ' || v_entry.memo END,
    'reversal', v_entry.id, false
  )
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_lines (
    company_id, user_id, entry_id, account_id, debit, credit, description
  )
  SELECT
    v_entry.company_id, auth.uid(), v_reversal_id, jl.account_id,
    jl.credit, jl.debit,
    CASE WHEN jl.description IS NULL THEN 'Reversal' ELSE 'Reversal: ' || jl.description END
  FROM public.journal_lines jl
  WHERE jl.entry_id = v_entry.id;

  UPDATE public.journal_entries
     SET is_posted = true
   WHERE id = v_reversal_id;

  UPDATE public.journal_entries
     SET voided_at = pg_catalog.now(),
         voided_by = auth.uid(),
         reversed_by_entry_id = v_reversal_id
   WHERE id = v_entry.id;

  RETURN v_reversal_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.void_manual_journal_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_manual_journal_entry(uuid) TO authenticated;

-- Atomic payroll posting. The pay-run lock prevents duplicate concurrent
-- postings; all accounts, ledger lines and state changes are one transaction.
CREATE OR REPLACE FUNCTION public.post_payrun_to_ledger(
  p_pay_run_id uuid,
  p_salary_expense_account_id uuid,
  p_employer_tax_expense_account_id uuid,
  p_statutory_payable_account_id uuid,
  p_bank_account_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
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
     OR public.get_company_role(v_run.company_id) = 'viewer'::public.company_member_role THEN
    RAISE EXCEPTION 'Not permitted to post payroll for this company';
  END IF;

  v_total_gross := COALESCE(v_run.total_gross, 0);
  v_employer_contrib := COALESCE(v_run.total_employer_contributions, 0);
  v_statutory_liability := COALESCE(v_run.total_employee_deductions, 0) + v_employer_contrib;
  v_total_net := COALESCE(v_run.total_net, 0);

  IF v_total_gross < 0 OR v_employer_contrib < 0
     OR v_statutory_liability < 0 OR v_total_net < 0
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
$function$;

REVOKE ALL ON FUNCTION public.post_payrun_to_ledger(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_payrun_to_ledger(uuid, uuid, uuid, uuid, uuid) TO authenticated;
