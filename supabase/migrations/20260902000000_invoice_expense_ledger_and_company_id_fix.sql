-- ============================================================
-- 1. CRITICAL FIX: every journal-posting function omitted
--    company_id on its journal_entries/journal_lines inserts,
--    relying on autofill_company_id -> get_default_company_id(),
--    which resolves from auth.uid()'s DEFAULT company, not the
--    company the transaction actually belongs to. For any user
--    in more than one company, this could file a journal entry
--    under the wrong company. Every insert below now sets
--    company_id explicitly from the source record.
-- ============================================================

CREATE OR REPLACE FUNCTION public.post_bill_journal(_bill_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD; ap_id uuid; def_exp uuid; eid uuid; line RECORD; total_lines numeric := 0; fx numeric;
BEGIN
  SELECT * INTO b FROM public.bills WHERE id=_bill_id;
  IF b IS NULL OR b.status IN ('draft','void') THEN RETURN; END IF;
  fx := COALESCE(b.exchange_rate, 1);
  ap_id := public.find_account_by_company(b.company_id,'2000');
  def_exp := public.find_account_by_company(b.company_id,'7900');
  IF ap_id IS NULL OR def_exp IS NULL THEN RETURN; END IF;
  INSERT INTO public.journal_entries(company_id,user_id,entry_date,reference,memo,source_type,source_id,is_posted)
    VALUES (b.company_id,b.user_id,b.issue_date,b.bill_number,'Bill from vendor','bill',b.id,true)
    RETURNING id INTO eid;
  FOR line IN SELECT * FROM public.bill_items WHERE bill_id=_bill_id LOOP
    INSERT INTO public.journal_lines(company_id,user_id,entry_id,account_id,debit,credit,description)
      VALUES (b.company_id,b.user_id,eid,COALESCE(line.account_id,def_exp),round(line.amount * fx, 2),0,line.description);
    total_lines := total_lines + round(line.amount * fx, 2);
  END LOOP;
  IF b.tax > 0 THEN
    INSERT INTO public.journal_lines(company_id,user_id,entry_id,account_id,debit,credit,description)
      VALUES (b.company_id,b.user_id,eid,def_exp,round(b.tax * fx, 2),0,'Tax');
    total_lines := total_lines + round(b.tax * fx, 2);
  END IF;
  INSERT INTO public.journal_lines(company_id,user_id,entry_id,account_id,debit,credit,description)
    VALUES (b.company_id,b.user_id,eid,ap_id,0,total_lines,'Accounts payable');
END $$;

CREATE OR REPLACE FUNCTION public.post_payment_journal(_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p RECORD; inv RECORD; ar_id uuid; dep_id uuid; fxgain_id uuid; fxloss_id uuid;
  eid uuid; inv_number text; base_amt numeric; ar_value numeric; fx_diff numeric;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id=_payment_id;
  IF p IS NULL THEN RETURN; END IF;
  SELECT invoice_number, total, base_currency_amount INTO inv
    FROM public.invoices WHERE id=p.invoice_id;
  inv_number := inv.invoice_number;

  dep_id := p.deposit_account_id;
  IF dep_id IS NULL THEN dep_id := public.find_account_by_company(p.company_id, '1010'); END IF;
  IF dep_id IS NULL THEN dep_id := public.find_account_by_company(p.company_id, '1000'); END IF;
  ar_id := public.find_account_by_company(p.company_id, '1100');
  IF dep_id IS NULL OR ar_id IS NULL THEN RETURN; END IF;

  base_amt := COALESCE(p.base_currency_amount, p.amount);
  IF inv.total IS NOT NULL AND inv.total <> 0 AND inv.base_currency_amount IS NOT NULL THEN
    ar_value := round((p.amount / inv.total) * inv.base_currency_amount, 2);
  ELSE
    ar_value := base_amt;
  END IF;
  fx_diff := round(base_amt - ar_value, 2);

  INSERT INTO public.journal_entries (company_id, user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (p.company_id, p.user_id, p.payment_date, 'PMT-'||inv_number, 'Payment for invoice '||inv_number, 'payment', p.id, true)
    RETURNING id INTO eid;

  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (p.company_id, p.user_id, eid, dep_id, base_amt, 0, 'Payment deposit ('||p.method||')');
  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (p.company_id, p.user_id, eid, ar_id, 0, ar_value, 'AR settlement');

  IF fx_diff > 0.005 THEN
    fxgain_id := public.find_account_by_company(p.company_id, '4910');
    IF fxgain_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.company_id, p.user_id, eid, fxgain_id, 0, fx_diff, 'FX gain on settlement');
    END IF;
  ELSIF fx_diff < -0.005 THEN
    fxloss_id := public.find_account_by_company(p.company_id, '6910');
    IF fxloss_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.company_id, p.user_id, eid, fxloss_id, -fx_diff, 0, 'FX loss on settlement');
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.post_bill_payment_journal(_pay_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p RECORD; bill RECORD; ap_id uuid; src_id uuid; fxgain_id uuid; fxloss_id uuid;
  eid uuid; bill_num text; base_amt numeric; ap_value numeric; fx_diff numeric;
BEGIN
  SELECT * INTO p FROM public.bill_payments WHERE id=_pay_id;
  IF p IS NULL THEN RETURN; END IF;
  SELECT bill_number, total, base_currency_amount INTO bill
    FROM public.bills WHERE id=p.bill_id;
  bill_num := bill.bill_number;

  ap_id := public.find_account_by_company(p.company_id,'2000');
  src_id := p.source_account_id;
  IF src_id IS NULL THEN src_id := public.find_account_by_company(p.company_id,'1010'); END IF;
  IF src_id IS NULL THEN src_id := public.find_account_by_company(p.company_id,'1000'); END IF;
  IF ap_id IS NULL OR src_id IS NULL THEN RETURN; END IF;

  base_amt := COALESCE(p.base_currency_amount, p.amount);
  IF bill.total IS NOT NULL AND bill.total <> 0 AND bill.base_currency_amount IS NOT NULL THEN
    ap_value := round((p.amount / bill.total) * bill.base_currency_amount, 2);
  ELSE
    ap_value := base_amt;
  END IF;
  fx_diff := round(ap_value - base_amt, 2);

  INSERT INTO public.journal_entries(company_id,user_id,entry_date,reference,memo,source_type,source_id,is_posted)
    VALUES (p.company_id,p.user_id,p.payment_date,'BPMT-'||bill_num,'Payment for bill '||bill_num,'bill_payment',p.id,true)
    RETURNING id INTO eid;

  INSERT INTO public.journal_lines(company_id,user_id,entry_id,account_id,debit,credit,description)
    VALUES (p.company_id,p.user_id,eid,ap_id,ap_value,0,'AP settlement');
  INSERT INTO public.journal_lines(company_id,user_id,entry_id,account_id,debit,credit,description)
    VALUES (p.company_id,p.user_id,eid,src_id,0,base_amt,'Bill payment ('||p.method||')');

  IF fx_diff > 0.005 THEN
    fxgain_id := public.find_account_by_company(p.company_id, '4910');
    IF fxgain_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.company_id, p.user_id, eid, fxgain_id, 0, fx_diff, 'FX gain on settlement');
    END IF;
  ELSIF fx_diff < -0.005 THEN
    fxloss_id := public.find_account_by_company(p.company_id, '6910');
    IF fxloss_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.company_id, p.user_id, eid, fxloss_id, -fx_diff, 0, 'FX loss on settlement');
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.post_credit_note_journal(_cn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c RECORD; rev_id uuid; ar_id uuid; eid uuid; inv_number text; base_amt numeric;
BEGIN
  SELECT * INTO c FROM public.credit_notes WHERE id=_cn_id;
  IF c IS NULL THEN RETURN; END IF;
  SELECT invoice_number INTO inv_number FROM public.invoices WHERE id=c.invoice_id;
  rev_id := public.find_account_by_company(c.company_id, '4000');
  ar_id := public.find_account_by_company(c.company_id, '1100');
  IF rev_id IS NULL OR ar_id IS NULL THEN RETURN; END IF;
  base_amt := COALESCE(c.base_currency_amount, c.amount);
  INSERT INTO public.journal_entries (company_id, user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (c.company_id, c.user_id, c.issue_date, c.credit_note_number, 'Credit note against '||inv_number, 'credit_note', c.id, true)
    RETURNING id INTO eid;
  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (c.company_id, c.user_id, eid, rev_id, base_amt, 0, 'Revenue reversal');
  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (c.company_id, c.user_id, eid, ar_id, 0, base_amt, 'AR credit');
END $$;

CREATE OR REPLACE FUNCTION public.revalue_open_transaction(
  _type text,
  _id uuid,
  _new_rate numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_company_id uuid; v_user_id uuid; v_old_base numeric; v_new_base numeric; v_diff numeric;
  v_status text; v_total numeric; v_fx_gain_id uuid; v_fx_loss_id uuid; v_eid uuid;
  v_clearing_id uuid; v_ref text;
BEGIN
  IF _new_rate IS NULL OR _new_rate <= 0 THEN
    RAISE EXCEPTION 'Revaluation rate must be positive';
  END IF;

  IF _type = 'invoice' THEN
    SELECT i.company_id, i.user_id, i.base_currency_amount, i.status, i.total, i.invoice_number
      INTO v_company_id, v_user_id, v_old_base, v_status, v_total, v_ref
      FROM public.invoices i WHERE i.id = _id;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    IF v_status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid invoice'; END IF;
    v_clearing_id := public.find_account_by_company(v_company_id, '1100');
  ELSIF _type = 'bill' THEN
    SELECT b.company_id, b.user_id, b.base_currency_amount, b.status, b.total, b.bill_number
      INTO v_company_id, v_user_id, v_old_base, v_status, v_total, v_ref
      FROM public.bills b WHERE b.id = _id;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF v_status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid bill'; END IF;
    v_clearing_id := public.find_account_by_company(v_company_id, '2000');
  ELSE
    RAISE EXCEPTION 'Unknown revaluation type: %', _type;
  END IF;

  IF NOT public.is_company_member(v_company_id) OR public.get_company_role(v_company_id) = 'viewer' THEN
    RAISE EXCEPTION 'Not permitted to revalue transactions for this company';
  END IF;
  IF v_clearing_id IS NULL THEN RAISE EXCEPTION 'Chart of accounts is missing a required account'; END IF;

  v_new_base := round(v_total * _new_rate, 2);
  v_diff := round(v_new_base - COALESCE(v_old_base, v_total), 2);
  IF v_diff = 0 THEN RETURN; END IF;

  IF _type = 'invoice' THEN
    UPDATE public.invoices SET exchange_rate = _new_rate, base_currency_amount = v_new_base WHERE id = _id;
  ELSE
    UPDATE public.bills SET exchange_rate = _new_rate, base_currency_amount = v_new_base WHERE id = _id;
  END IF;

  INSERT INTO public.journal_entries (company_id, user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (v_company_id, v_user_id, CURRENT_DATE, 'FXREV-'||v_ref, 'FX revaluation of open '||_type||' '||v_ref, 'fx_revaluation', _id, true)
    RETURNING id INTO v_eid;

  IF _type = 'invoice' THEN
    IF v_diff > 0 THEN
      v_fx_gain_id := public.find_account_by_company(v_company_id, '4910');
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (v_company_id, v_user_id, v_eid, v_clearing_id, v_diff, 0, 'AR revaluation');
      IF v_fx_gain_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
          VALUES (v_company_id, v_user_id, v_eid, v_fx_gain_id, 0, v_diff, 'Unrealized FX gain');
      END IF;
    ELSE
      v_fx_loss_id := public.find_account_by_company(v_company_id, '6910');
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (v_company_id, v_user_id, v_eid, v_clearing_id, 0, -v_diff, 'AR revaluation');
      IF v_fx_loss_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
          VALUES (v_company_id, v_user_id, v_eid, v_fx_loss_id, -v_diff, 0, 'Unrealized FX loss');
      END IF;
    END IF;
  ELSE
    IF v_diff > 0 THEN
      v_fx_loss_id := public.find_account_by_company(v_company_id, '6910');
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (v_company_id, v_user_id, v_eid, v_clearing_id, 0, v_diff, 'AP revaluation');
      IF v_fx_loss_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
          VALUES (v_company_id, v_user_id, v_eid, v_fx_loss_id, v_diff, 0, 'Unrealized FX loss');
      END IF;
    ELSE
      v_fx_gain_id := public.find_account_by_company(v_company_id, '4910');
      INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
        VALUES (v_company_id, v_user_id, v_eid, v_clearing_id, -v_diff, 0, 'AP revaluation');
      IF v_fx_gain_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
          VALUES (v_company_id, v_user_id, v_eid, v_fx_gain_id, 0, -v_diff, 'Unrealized FX gain');
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 2. Invoices -> ledger
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_invoice_journal(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv RECORD; ar_id uuid; rev_id uuid; eid uuid; base_amt numeric;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id=_invoice_id;
  IF inv IS NULL OR inv.status = 'draft' THEN RETURN; END IF;
  ar_id := public.find_account_by_company(inv.company_id, '1100');
  rev_id := public.find_account_by_company(inv.company_id, '4000');
  IF ar_id IS NULL OR rev_id IS NULL THEN RETURN; END IF;
  base_amt := COALESCE(inv.base_currency_amount, inv.total);
  IF base_amt = 0 THEN RETURN; END IF;

  INSERT INTO public.journal_entries (company_id, user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (inv.company_id, inv.user_id, inv.issue_date, inv.invoice_number, 'Invoice issued', 'invoice', inv.id, true)
    RETURNING id INTO eid;

  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (inv.company_id, inv.user_id, eid, ar_id, base_amt, 0, 'Accounts receivable');
  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (inv.company_id, inv.user_id, eid, rev_id, 0, base_amt, 'Sales revenue');
END $$;

CREATE OR REPLACE FUNCTION public.handle_invoice_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    -- posting deferred until invoice_items are inserted; the app
    -- performs a follow-up update after items are saved, which fires
    -- the UPDATE branch below.
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    DELETE FROM public.journal_entries WHERE source_type='invoice' AND source_id=NEW.id;
    PERFORM public.post_invoice_journal(NEW.id);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    DELETE FROM public.journal_entries WHERE source_type='invoice' AND source_id=OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_change ON public.invoices;
CREATE TRIGGER trg_invoice_change AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_change();

-- ============================================================
-- 3. Expenses -> ledger
--    expenses.category was free text with no link to the chart of
--    accounts, so there was no reliable account to post to. Adding
--    a nullable account_id (additive, same pattern as bill_items)
--    so the expense form can let the user pick one; falls back to
--    "Other expenses" (7900) when unset, same fallback bills use.
-- ============================================================
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.post_expense_journal(_expense_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e RECORD; exp_id uuid; pay_id uuid; eid uuid; base_amt numeric;
BEGIN
  SELECT * INTO e FROM public.expenses WHERE id=_expense_id;
  IF e IS NULL THEN RETURN; END IF;
  exp_id := e.account_id;
  IF exp_id IS NULL THEN exp_id := public.find_account_by_company(e.company_id, '7900'); END IF;
  pay_id := public.find_account_by_company(e.company_id, '1010');
  IF pay_id IS NULL THEN pay_id := public.find_account_by_company(e.company_id, '1000'); END IF;
  IF exp_id IS NULL OR pay_id IS NULL THEN RETURN; END IF;
  base_amt := COALESCE(e.base_currency_amount, e.amount);
  IF base_amt = 0 THEN RETURN; END IF;

  INSERT INTO public.journal_entries (company_id, user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (e.company_id, e.user_id, e.expense_date, COALESCE(e.vendor, 'Expense'), COALESCE(e.description, e.category, 'Expense'), 'expense', e.id, true)
    RETURNING id INTO eid;

  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (e.company_id, e.user_id, eid, exp_id, base_amt, 0, COALESCE(e.category, 'Expense'));
  INSERT INTO public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
    VALUES (e.company_id, e.user_id, eid, pay_id, 0, base_amt, 'Paid from bank/cash');
END $$;

CREATE OR REPLACE FUNCTION public.handle_expense_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.post_expense_journal(NEW.id);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    DELETE FROM public.journal_entries WHERE source_type='expense' AND source_id=NEW.id;
    PERFORM public.post_expense_journal(NEW.id);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    DELETE FROM public.journal_entries WHERE source_type='expense' AND source_id=OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_expense_change ON public.expenses;
CREATE TRIGGER trg_expense_change AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_expense_change();

-- ============================================================
-- 4. One-time backfill of historical invoices/expenses that
--    predate ledger posting. Idempotent: relies on the DELETE-then-
--    repost pattern inside each post_*_journal caller path — here
--    we call the post function directly per row, and since no
--    journal_entries exist yet for source_type in ('invoice','expense')
--    this cannot double-post.
-- ============================================================
DO $$
DECLARE r RECORD; n_inv int := 0; n_exp int := 0;
BEGIN
  FOR r IN SELECT id FROM public.invoices WHERE status <> 'draft' LOOP
    PERFORM public.post_invoice_journal(r.id);
    n_inv := n_inv + 1;
  END LOOP;
  FOR r IN SELECT id FROM public.expenses LOOP
    PERFORM public.post_expense_journal(r.id);
    n_exp := n_exp + 1;
  END LOOP;
  RAISE NOTICE 'Backfilled % invoices and % expenses to the ledger', n_inv, n_exp;
END $$;
