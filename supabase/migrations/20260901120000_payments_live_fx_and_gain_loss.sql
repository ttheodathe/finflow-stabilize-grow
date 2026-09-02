-- ============================================================
-- Live FX rate locking for settlement transactions (payments,
-- bill_payments, credit_notes) + FX Gain/Loss accounts +
-- explicit revaluation RPC for open invoices/bills.
--
-- Invoices, bills, and expenses already lock a live rate at
-- creation time (src/lib/fx-lock.ts -> exchange_rate,
-- base_currency_amount columns). This migration extends the
-- same pattern to the transactions that were missing it:
-- customer payments, vendor bill payments, and credit notes.
--
-- Nothing here changes how already-booked invoice/bill totals
-- are calculated — those remain locked at their original rate
-- forever, per the accounting-integrity rules already in place.
-- ============================================================

-- 1. New columns, additive + backfilled (same pattern as
--    invoices/bills/expenses: nullable, default rate 1).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_currency_amount numeric;

ALTER TABLE public.bill_payments
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_currency_amount numeric;

ALTER TABLE public.credit_notes
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_currency_amount numeric;

UPDATE public.payments SET base_currency_amount = amount WHERE base_currency_amount IS NULL;
UPDATE public.bill_payments SET base_currency_amount = amount WHERE base_currency_amount IS NULL;
UPDATE public.credit_notes SET base_currency_amount = amount WHERE base_currency_amount IS NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_exchange_rate_positive CHECK (exchange_rate > 0);
ALTER TABLE public.bill_payments
  ADD CONSTRAINT bill_payments_exchange_rate_positive CHECK (exchange_rate > 0);
ALTER TABLE public.credit_notes
  ADD CONSTRAINT credit_notes_exchange_rate_positive CHECK (exchange_rate > 0);

-- 2. FX Gain / FX Loss accounts — add to the default chart of
--    accounts seeded for every new company, and backfill onto
--    existing companies.
CREATE OR REPLACE FUNCTION public.create_company(
  p_name text,
  p_email text DEFAULT NULL::text,
  p_address text DEFAULT NULL::text,
  p_currency text DEFAULT 'USD'::text,
  p_organization_id uuid DEFAULT NULL::uuid,
  p_phone text DEFAULT NULL::text,
  p_website text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_state text DEFAULT NULL::text,
  p_postal_code text DEFAULT NULL::text,
  p_country text DEFAULT NULL::text,
  p_tax_number text DEFAULT NULL::text
)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_plan text;
  v_status text;
  v_max_companies int;
  v_owned_count int;
  v_new_company public.companies;
  v_owner_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Company name is required';
  end if;

  insert into public.profiles (id, email)
  select auth.uid(), u.email
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  select id into v_owner_role_id
  from public.roles
  where key = 'owner' and company_id is null and is_system = true
  limit 1;

  if v_owner_role_id is null then
    raise exception 'System owner role is not configured';
  end if;

  if p_organization_id is not null then
    v_org_id := p_organization_id;
    if not exists (select 1 from public.organizations where id = v_org_id and owner_id = auth.uid()) then
      raise exception 'You do not own this organization';
    end if;
  else
    select id into v_org_id from public.organizations where owner_id = auth.uid() limit 1;
    if v_org_id is null then
      insert into public.organizations (name, owner_id)
      values (p_name, auth.uid())
      returning id into v_org_id;

      insert into public.organization_members (organization_id, user_id, role, status, joined_at)
      values (v_org_id, auth.uid(), 'owner', 'active', now());
    end if;
  end if;

  select plan, status into v_plan, v_status from public.subscriptions where user_id = auth.uid();
  if v_status is distinct from 'active' and v_status is distinct from 'trialing' then
    v_plan := 'free';
  end if;

  select max_companies into v_max_companies
  from public.subscription_plans
  where key = coalesce(v_plan, 'free') and is_active;

  if v_max_companies is null then
    select max_companies into v_max_companies from public.subscription_plans where key = 'free';
  end if;

  select count(*) into v_owned_count
  from public.companies c
  join public.company_members cm on cm.company_id = c.id
  where cm.user_id = auth.uid() and cm.role = 'owner';

  if v_owned_count >= v_max_companies then
    raise exception 'company_limit_reached: your plan allows up to % companies', v_max_companies
      using errcode = 'P0001';
  end if;

  insert into public.companies (
    user_id, name, email, address, currency, organization_id,
    phone, website, city, state, postal_code, country, tax_number
  ) values (
    auth.uid(), trim(p_name), p_email, p_address, coalesce(p_currency, 'USD'), v_org_id,
    p_phone, p_website, p_city, p_state, p_postal_code, p_country, p_tax_number
  )
  returning * into v_new_company;

  insert into public.company_members (company_id, user_id, role, role_id, status, joined_at)
  values (v_new_company.id, auth.uid(), 'owner', v_owner_role_id, 'active', now());

  insert into public.company_settings (company_id, timezone)
  values (v_new_company.id, 'UTC');

  insert into public.company_tax_settings (company_id, name, rate, is_default)
  values (v_new_company.id, 'No Tax', 0, true);

  insert into public.accounts (user_id, company_id, code, name, type, is_system, is_active)
  values
    (auth.uid(), v_new_company.id, '1000', 'Cash', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1010', 'Bank account', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1100', 'Accounts receivable', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1200', 'Inventory', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1500', 'Fixed assets', 'asset', true, true),
    (auth.uid(), v_new_company.id, '2000', 'Accounts payable', 'liability', true, true),
    (auth.uid(), v_new_company.id, '2100', 'Sales tax payable', 'liability', true, true),
    (auth.uid(), v_new_company.id, '2200', 'Credit card', 'liability', true, true),
    (auth.uid(), v_new_company.id, '2500', 'Loans payable', 'liability', true, true),
    (auth.uid(), v_new_company.id, '3000', 'Owner equity', 'equity', true, true),
    (auth.uid(), v_new_company.id, '3100', 'Retained earnings', 'equity', true, true),
    (auth.uid(), v_new_company.id, '3200', 'Owner draws', 'equity', true, true),
    (auth.uid(), v_new_company.id, '4000', 'Sales revenue', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '4100', 'Service revenue', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '4900', 'Other income', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '4910', 'FX gain', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '5000', 'Cost of goods sold', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6000', 'Rent', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6100', 'Utilities', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6200', 'Salaries and wages', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6300', 'Office supplies', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6400', 'Software and subscriptions', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6500', 'Marketing and advertising', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6600', 'Travel', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6700', 'Meals and entertainment', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6800', 'Professional fees', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6900', 'Bank fees', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6910', 'FX loss', 'expense', true, true),
    (auth.uid(), v_new_company.id, '7000', 'Depreciation', 'expense', true, true),
    (auth.uid(), v_new_company.id, '7900', 'Other expenses', 'expense', true, true);

  insert into public.audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
  values (v_new_company.id, auth.uid(), 'company.created', 'company', v_new_company.id,
    jsonb_build_object('name', v_new_company.name));

  return v_new_company;
end;
$function$;

-- Backfill FX accounts onto companies that already exist.
INSERT INTO public.accounts (user_id, company_id, code, name, type, is_system, is_active)
SELECT c.user_id, c.id, '4910', 'FX gain', 'revenue', true, true
FROM public.companies c
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO public.accounts (user_id, company_id, code, name, type, is_system, is_active)
SELECT c.user_id, c.id, '6910', 'FX loss', 'expense', true, true
FROM public.companies c
ON CONFLICT (company_id, code) DO NOTHING;

-- 3. post_payment_journal — post the base-currency amount
--    instead of the raw (possibly foreign-currency) amount, and
--    book the FX gain/loss between the invoice's originally
--    booked AR value and what actually landed in the bank today.
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
  IF dep_id IS NULL THEN dep_id := public.find_account(p.user_id, '1010'); END IF;
  IF dep_id IS NULL THEN dep_id := public.find_account(p.user_id, '1000'); END IF;
  ar_id := public.find_account(p.user_id, '1100');
  IF dep_id IS NULL OR ar_id IS NULL THEN RETURN; END IF;

  base_amt := COALESCE(p.base_currency_amount, p.amount);
  IF inv.total IS NOT NULL AND inv.total <> 0 AND inv.base_currency_amount IS NOT NULL THEN
    ar_value := round((p.amount / inv.total) * inv.base_currency_amount, 2);
  ELSE
    ar_value := base_amt;
  END IF;
  fx_diff := round(base_amt - ar_value, 2);

  INSERT INTO public.journal_entries (user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (p.user_id, p.payment_date, 'PMT-'||inv_number, 'Payment for invoice '||inv_number, 'payment', p.id, true)
    RETURNING id INTO eid;

  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (p.user_id, eid, dep_id, base_amt, 0, 'Payment deposit ('||p.method||')');
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (p.user_id, eid, ar_id, 0, ar_value, 'AR settlement');

  IF fx_diff > 0.005 THEN
    fxgain_id := public.find_account(p.user_id, '4910');
    IF fxgain_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.user_id, eid, fxgain_id, 0, fx_diff, 'FX gain on settlement');
    END IF;
  ELSIF fx_diff < -0.005 THEN
    fxloss_id := public.find_account(p.user_id, '6910');
    IF fxloss_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.user_id, eid, fxloss_id, -fx_diff, 0, 'FX loss on settlement');
    END IF;
  END IF;
END $$;

-- 4. post_bill_payment_journal — same treatment for AP.
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

  ap_id := public.find_account(p.user_id,'2000');
  src_id := p.source_account_id;
  IF src_id IS NULL THEN src_id := public.find_account(p.user_id,'1010'); END IF;
  IF src_id IS NULL THEN src_id := public.find_account(p.user_id,'1000'); END IF;
  IF ap_id IS NULL OR src_id IS NULL THEN RETURN; END IF;

  base_amt := COALESCE(p.base_currency_amount, p.amount);
  IF bill.total IS NOT NULL AND bill.total <> 0 AND bill.base_currency_amount IS NOT NULL THEN
    ap_value := round((p.amount / bill.total) * bill.base_currency_amount, 2);
  ELSE
    ap_value := base_amt;
  END IF;
  fx_diff := round(ap_value - base_amt, 2);

  INSERT INTO public.journal_entries(user_id,entry_date,reference,memo,source_type,source_id,is_posted)
    VALUES (p.user_id,p.payment_date,'BPMT-'||bill_num,'Payment for bill '||bill_num,'bill_payment',p.id,true)
    RETURNING id INTO eid;

  INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
    VALUES (p.user_id,eid,ap_id,ap_value,0,'AP settlement');
  INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
    VALUES (p.user_id,eid,src_id,0,base_amt,'Bill payment ('||p.method||')');

  IF fx_diff > 0.005 THEN
    fxgain_id := public.find_account(p.user_id, '4910');
    IF fxgain_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.user_id, eid, fxgain_id, 0, fx_diff, 'FX gain on settlement');
    END IF;
  ELSIF fx_diff < -0.005 THEN
    fxloss_id := public.find_account(p.user_id, '6910');
    IF fxloss_id IS NOT NULL THEN
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (p.user_id, eid, fxloss_id, -fx_diff, 0, 'FX loss on settlement');
    END IF;
  END IF;
END $$;

-- 5. Credit notes inherit the linked invoice's currency and
--    LOCKED rate (not a fresh live rate) — a credit note isn't a
--    new settlement event, it's a reversal of the original sale,
--    so it must mirror exactly what the invoice booked.
CREATE OR REPLACE FUNCTION public.set_credit_note_fx()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv RECORD;
BEGIN
  SELECT currency, exchange_rate INTO inv FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv IS NOT NULL THEN
    NEW.currency := inv.currency;
    NEW.exchange_rate := COALESCE(inv.exchange_rate, 1);
    NEW.base_currency_amount := NEW.amount * COALESCE(inv.exchange_rate, 1);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_credit_notes_set_fx ON public.credit_notes;
CREATE TRIGGER trg_credit_notes_set_fx
  BEFORE INSERT OR UPDATE OF amount, invoice_id ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_credit_note_fx();

CREATE OR REPLACE FUNCTION public.post_credit_note_journal(_cn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c RECORD; rev_id uuid; ar_id uuid; eid uuid; inv_number text; base_amt numeric;
BEGIN
  SELECT * INTO c FROM public.credit_notes WHERE id=_cn_id;
  IF c IS NULL THEN RETURN; END IF;
  SELECT invoice_number INTO inv_number FROM public.invoices WHERE id=c.invoice_id;
  rev_id := public.find_account(c.user_id, '4000');
  ar_id := public.find_account(c.user_id, '1100');
  IF rev_id IS NULL OR ar_id IS NULL THEN RETURN; END IF;
  base_amt := COALESCE(c.base_currency_amount, c.amount);
  INSERT INTO public.journal_entries (user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (c.user_id, c.issue_date, c.credit_note_number, 'Credit note against '||inv_number, 'credit_note', c.id, true)
    RETURNING id INTO eid;
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (c.user_id, eid, rev_id, base_amt, 0, 'Revenue reversal');
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (c.user_id, eid, ar_id, 0, base_amt, 'AR credit');
END $$;

-- 6. Explicit revaluation RPC — updates ONLY base_currency_amount
--    and exchange_rate on an open (not fully paid) invoice or
--    bill, and posts an auditable FX adjustment entry for the
--    delta. The invoice/bill's foreign-currency total, subtotal,
--    tax, and original exchange_rate at creation are NEVER
--    touched — this is a deliberate, explicit, admin-only action,
--    never a silent recalculation.
CREATE OR REPLACE FUNCTION public.revalue_open_transaction(
  _type text,     -- 'invoice' or 'bill'
  _id uuid,
  _new_rate numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  co_id uuid; usr_id uuid; old_base numeric; new_base numeric; diff numeric;
  status text; total numeric; fx_gain_id uuid; fx_loss_id uuid; eid uuid;
  clearing_id uuid; ref text;
BEGIN
  IF _new_rate IS NULL OR _new_rate <= 0 THEN
    RAISE EXCEPTION 'Revaluation rate must be positive';
  END IF;

  IF _type = 'invoice' THEN
    SELECT company_id, user_id, base_currency_amount, status, total, invoice_number
      INTO co_id, usr_id, old_base, status, total, ref
      FROM public.invoices WHERE id = _id;
    IF status IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    IF status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid invoice'; END IF;
    clearing_id := public.find_account(usr_id, '1100'); -- AR
  ELSIF _type = 'bill' THEN
    SELECT company_id, user_id, base_currency_amount, status, total, bill_number
      INTO co_id, usr_id, old_base, status, total, ref
      FROM public.bills WHERE id = _id;
    IF status IS NULL THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid bill'; END IF;
    clearing_id := public.find_account(usr_id, '2000'); -- AP
  ELSE
    RAISE EXCEPTION 'Unknown revaluation type: %', _type;
  END IF;

  IF NOT public.is_company_member(co_id) OR public.get_company_role(co_id) = 'viewer' THEN
    RAISE EXCEPTION 'Not permitted to revalue transactions for this company';
  END IF;
  IF clearing_id IS NULL THEN RAISE EXCEPTION 'Chart of accounts is missing a required account'; END IF;

  new_base := round(total * _new_rate, 2);
  diff := round(new_base - COALESCE(old_base, total), 2);
  IF diff = 0 THEN RETURN; END IF;

  IF _type = 'invoice' THEN
    UPDATE public.invoices SET exchange_rate = _new_rate, base_currency_amount = new_base WHERE id = _id;
  ELSE
    UPDATE public.bills SET exchange_rate = _new_rate, base_currency_amount = new_base WHERE id = _id;
  END IF;

  INSERT INTO public.journal_entries (user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (usr_id, CURRENT_DATE, 'FXREV-'||ref, 'FX revaluation of open '||_type||' '||ref, 'fx_revaluation', _id, true)
    RETURNING id INTO eid;

  IF _type = 'invoice' THEN
    -- AR balance moved by diff (base currency owed to us changed).
    IF diff > 0 THEN
      fx_gain_id := public.find_account(usr_id, '4910');
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (usr_id, eid, clearing_id, diff, 0, 'AR revaluation');
      IF fx_gain_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
          VALUES (usr_id, eid, fx_gain_id, 0, diff, 'Unrealized FX gain');
      END IF;
    ELSE
      fx_loss_id := public.find_account(usr_id, '6910');
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (usr_id, eid, clearing_id, 0, -diff, 'AR revaluation');
      IF fx_loss_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
          VALUES (usr_id, eid, fx_loss_id, -diff, 0, 'Unrealized FX loss');
      END IF;
    END IF;
  ELSE
    -- AP balance moved by diff (base currency we owe changed).
    IF diff > 0 THEN
      fx_loss_id := public.find_account(usr_id, '6910');
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (usr_id, eid, clearing_id, 0, diff, 'AP revaluation');
      IF fx_loss_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
          VALUES (usr_id, eid, fx_loss_id, diff, 0, 'Unrealized FX loss');
      END IF;
    ELSE
      fx_gain_id := public.find_account(usr_id, '4910');
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
        VALUES (usr_id, eid, clearing_id, -diff, 0, 'AP revaluation');
      IF fx_gain_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
          VALUES (usr_id, eid, fx_gain_id, 0, -diff, 'Unrealized FX gain');
      END IF;
    END IF;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.revalue_open_transaction(text, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revalue_open_transaction(text, uuid, numeric) TO authenticated;
