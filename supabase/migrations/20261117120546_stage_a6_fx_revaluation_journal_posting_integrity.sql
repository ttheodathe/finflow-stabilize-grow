CREATE OR REPLACE FUNCTION public.revalue_open_transaction(
  _type text,
  _id uuid,
  _new_rate numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_old_base numeric;
  v_new_base numeric;
  v_diff numeric;
  v_status text;
  v_total numeric;
  v_fx_gain_id uuid;
  v_fx_loss_id uuid;
  v_eid uuid;
  v_clearing_id uuid;
  v_ref text;
  v_debits numeric;
  v_credits numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _new_rate IS NULL OR _new_rate <= 0 THEN
    RAISE EXCEPTION 'Revaluation rate must be positive';
  END IF;

  IF _type = 'invoice' THEN
    SELECT i.company_id, i.user_id, i.base_currency_amount, i.status, i.total, i.invoice_number
      INTO v_company_id, v_user_id, v_old_base, v_status, v_total, v_ref
      FROM public.invoices i
     WHERE i.id = _id
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    IF v_status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid invoice'; END IF;
    v_clearing_id := public.find_account_by_company(v_company_id, '1100');

  ELSIF _type = 'bill' THEN
    SELECT b.company_id, b.user_id, b.base_currency_amount, b.status, b.total, b.bill_number
      INTO v_company_id, v_user_id, v_old_base, v_status, v_total, v_ref
      FROM public.bills b
     WHERE b.id = _id
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF v_status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid bill'; END IF;
    v_clearing_id := public.find_account_by_company(v_company_id, '2000');

  ELSE
    RAISE EXCEPTION 'Unknown revaluation type: %', _type;
  END IF;

  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Transaction is missing company or user ownership';
  END IF;

  IF NOT public.is_company_member(v_company_id)
     OR public.get_company_role(v_company_id) = 'viewer' THEN
    RAISE EXCEPTION 'Not permitted to revalue transactions for this company';
  END IF;

  IF v_clearing_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.accounts a
     WHERE a.id = v_clearing_id
       AND a.is_active = true
       AND (a.company_id = v_company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'Chart of accounts is missing a valid company clearing account';
  END IF;

  v_new_base := round(v_total * _new_rate, 2);
  v_diff := round(v_new_base - COALESCE(v_old_base, v_total), 2);
  IF v_diff = 0 THEN RETURN; END IF;

  IF _type = 'invoice' THEN
    IF v_diff > 0 THEN
      v_fx_gain_id := public.find_account_by_company(v_company_id, '4910');
    ELSE
      v_fx_loss_id := public.find_account_by_company(v_company_id, '6910');
    END IF;
  ELSE
    IF v_diff > 0 THEN
      v_fx_loss_id := public.find_account_by_company(v_company_id, '6910');
    ELSE
      v_fx_gain_id := public.find_account_by_company(v_company_id, '4910');
    END IF;
  END IF;

  IF (_type = 'invoice' AND v_diff > 0 AND v_fx_gain_id IS NULL)
     OR (_type = 'invoice' AND v_diff < 0 AND v_fx_loss_id IS NULL)
     OR (_type = 'bill' AND v_diff > 0 AND v_fx_loss_id IS NULL)
     OR (_type = 'bill' AND v_diff < 0 AND v_fx_gain_id IS NULL) THEN
    RAISE EXCEPTION 'Chart of accounts is missing the required FX gain/loss account';
  END IF;

  IF v_fx_gain_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = v_fx_gain_id
       AND a.is_active = true
       AND (a.company_id = v_company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'FX gain account does not belong to this company';
  END IF;

  IF v_fx_loss_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = v_fx_loss_id
       AND a.is_active = true
       AND (a.company_id = v_company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'FX loss account does not belong to this company';
  END IF;

  IF _type = 'invoice' THEN
    UPDATE public.invoices
       SET exchange_rate = _new_rate,
           base_currency_amount = v_new_base
     WHERE id = _id
       AND company_id = v_company_id;
  ELSE
    UPDATE public.bills
       SET exchange_rate = _new_rate,
           base_currency_amount = v_new_base
     WHERE id = _id
       AND company_id = v_company_id;
  END IF;

  INSERT INTO public.journal_entries
    (user_id, company_id, entry_date, reference, memo, source_type, source_id, is_posted)
  VALUES
    (v_user_id, v_company_id, CURRENT_DATE, 'FXREV-' || v_ref,
     'FX revaluation of open ' || _type || ' ' || v_ref,
     'fx_revaluation', _id, false)
  RETURNING id INTO v_eid;

  IF _type = 'invoice' THEN
    IF v_diff > 0 THEN
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, v_diff, 0, 'AR revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_gain_id, 0, v_diff, 'Unrealized FX gain');
    ELSE
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, 0, -v_diff, 'AR revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_loss_id, -v_diff, 0, 'Unrealized FX loss');
    END IF;
  ELSE
    IF v_diff > 0 THEN
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, 0, v_diff, 'AP revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_loss_id, v_diff, 0, 'Unrealized FX loss');
    ELSE
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, -v_diff, 0, 'AP revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_gain_id, 0, -v_diff, 'Unrealized FX gain');
    END IF;
  END IF;

  SELECT COALESCE(sum(jl.debit), 0), COALESCE(sum(jl.credit), 0)
    INTO v_debits, v_credits
    FROM public.journal_lines jl
   WHERE jl.entry_id = v_eid
     AND jl.company_id = v_company_id;

  IF round(v_debits, 2) <> round(v_credits, 2) THEN
    RAISE EXCEPTION 'FX revaluation journal entry is unbalanced';
  END IF;

  UPDATE public.journal_entries
     SET is_posted = true
   WHERE id = v_eid
     AND company_id = v_company_id;
END;
$function$;
