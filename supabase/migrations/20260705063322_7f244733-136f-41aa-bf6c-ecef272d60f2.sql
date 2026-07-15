
-- ============ ESTIMATES ============
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  estimate_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  status text NOT NULL DEFAULT 'draft', -- draft, sent, accepted, declined, converted
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  converted_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT ALL ON public.estimates TO service_role;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estimates" ON public.estimates FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER set_updated_at_estimates BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_items TO authenticated;
GRANT ALL ON public.estimate_items TO service_role;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estimate items" ON public.estimate_items FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- ============ RECURRING INVOICES ============
CREATE TABLE public.recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  frequency text NOT NULL, -- weekly, monthly, annual
  next_run_date date NOT NULL,
  last_run_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoices TO authenticated;
GRANT ALL ON public.recurring_invoices TO service_role;
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recurring" ON public.recurring_invoices FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER set_updated_at_recurring BEFORE UPDATE ON public.recurring_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CREDIT NOTES ============
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_note_number text NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'issued', -- issued, void
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credit notes" ON public.credit_notes FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER set_updated_at_credit_notes BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAYMENTS RECEIVED ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  method text NOT NULL DEFAULT 'bank_transfer', -- cash, bank_transfer, card, check, other
  reference text,
  deposit_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_credit_notes_invoice ON public.credit_notes(invoice_id);
CREATE INDEX idx_estimate_items_est ON public.estimate_items(estimate_id);

-- Helper to find or create an account by code for the user (used by triggers)
CREATE OR REPLACE FUNCTION public.find_account(_user_id uuid, _code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.accounts WHERE user_id=_user_id AND code=_code AND is_active=true LIMIT 1;
$$;

-- Update invoice paid/partial status based on payments total
CREATE OR REPLACE FUNCTION public.recalc_invoice_status(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE paid numeric; inv_total numeric; new_status text; cur_status text;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO paid FROM public.payments WHERE invoice_id=_invoice_id;
  SELECT total, status INTO inv_total, cur_status FROM public.invoices WHERE id=_invoice_id;
  IF inv_total IS NULL THEN RETURN; END IF;
  IF paid <= 0 THEN
    IF cur_status IN ('paid','partial') THEN new_status := 'sent'; ELSE new_status := cur_status; END IF;
  ELSIF paid >= inv_total THEN new_status := 'paid';
  ELSE new_status := 'partial';
  END IF;
  IF new_status <> cur_status THEN
    UPDATE public.invoices SET status=new_status WHERE id=_invoice_id;
  END IF;
END $$;

-- Post journal entry for a payment (Debit deposit account, Credit AR)
CREATE OR REPLACE FUNCTION public.post_payment_journal(_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p RECORD; ar_id uuid; dep_id uuid; eid uuid; inv_number text;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id=_payment_id;
  IF p IS NULL THEN RETURN; END IF;
  SELECT invoice_number INTO inv_number FROM public.invoices WHERE id=p.invoice_id;
  dep_id := p.deposit_account_id;
  IF dep_id IS NULL THEN dep_id := public.find_account(p.user_id, '1010'); END IF;
  IF dep_id IS NULL THEN dep_id := public.find_account(p.user_id, '1000'); END IF;
  ar_id := public.find_account(p.user_id, '1100');
  IF dep_id IS NULL OR ar_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.journal_entries (user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (p.user_id, p.payment_date, 'PMT-'||inv_number, 'Payment for invoice '||inv_number, 'payment', p.id, true)
    RETURNING id INTO eid;
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (p.user_id, eid, dep_id, p.amount, 0, 'Payment deposit ('||p.method||')');
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (p.user_id, eid, ar_id, 0, p.amount, 'AR settlement');
END $$;

CREATE OR REPLACE FUNCTION public.handle_payment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.post_payment_journal(NEW.id);
    PERFORM public.recalc_invoice_status(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    DELETE FROM public.journal_entries WHERE source_type='payment' AND source_id=NEW.id;
    PERFORM public.post_payment_journal(NEW.id);
    PERFORM public.recalc_invoice_status(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    DELETE FROM public.journal_entries WHERE source_type='payment' AND source_id=OLD.id;
    PERFORM public.recalc_invoice_status(OLD.invoice_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_payments_after AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_payment_change();

-- Post journal for credit note (Debit Sales Revenue, Credit AR)
CREATE OR REPLACE FUNCTION public.post_credit_note_journal(_cn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c RECORD; rev_id uuid; ar_id uuid; eid uuid; inv_number text;
BEGIN
  SELECT * INTO c FROM public.credit_notes WHERE id=_cn_id;
  IF c IS NULL THEN RETURN; END IF;
  SELECT invoice_number INTO inv_number FROM public.invoices WHERE id=c.invoice_id;
  rev_id := public.find_account(c.user_id, '4000');
  ar_id := public.find_account(c.user_id, '1100');
  IF rev_id IS NULL OR ar_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.journal_entries (user_id, entry_date, reference, memo, source_type, source_id, is_posted)
    VALUES (c.user_id, c.issue_date, c.credit_note_number, 'Credit note against '||inv_number, 'credit_note', c.id, true)
    RETURNING id INTO eid;
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (c.user_id, eid, rev_id, c.amount, 0, 'Revenue reversal');
  INSERT INTO public.journal_lines (user_id, entry_id, account_id, debit, credit, description)
    VALUES (c.user_id, eid, ar_id, 0, c.amount, 'AR credit');
END $$;

CREATE OR REPLACE FUNCTION public.handle_credit_note_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status='issued' THEN PERFORM public.post_credit_note_journal(NEW.id); END IF;
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    DELETE FROM public.journal_entries WHERE source_type='credit_note' AND source_id=NEW.id;
    IF NEW.status='issued' THEN PERFORM public.post_credit_note_journal(NEW.id); END IF;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    DELETE FROM public.journal_entries WHERE source_type='credit_note' AND source_id=OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_credit_notes_after AFTER INSERT OR UPDATE OR DELETE ON public.credit_notes
FOR EACH ROW EXECUTE FUNCTION public.handle_credit_note_change();

-- Allow 'partial' status on invoices (no constraint exists but ensure app handles it)
