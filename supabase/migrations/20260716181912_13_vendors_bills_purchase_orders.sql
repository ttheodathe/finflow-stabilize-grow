
-- Vendors
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text, phone text, address text,
  payment_terms int NOT NULL DEFAULT 30,
  tax_id text,
  is_1099 boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vendors" ON public.vendors FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bills
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  bill_number text NOT NULL,
  reference text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bills" ON public.bills FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  item_id uuid,
  account_id uuid REFERENCES public.accounts(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_items TO authenticated;
GRANT ALL ON public.bill_items TO service_role;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bill_items" ON public.bill_items FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Bill payments
CREATE TABLE public.bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  method text NOT NULL DEFAULT 'bank_transfer',
  reference text,
  source_account_id uuid REFERENCES public.accounts(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bill_payments" ON public.bill_payments FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER trg_bill_payments_updated BEFORE UPDATE ON public.bill_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  converted_bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchase_orders" ON public.purchase_orders FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id uuid,
  account_id uuid REFERENCES public.accounts(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own po_items" ON public.purchase_order_items FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Recalc bill status based on payments
CREATE OR REPLACE FUNCTION public.recalc_bill_status(_bill_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE paid numeric; bill_total numeric; cur_status text; new_status text;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO paid FROM public.bill_payments WHERE bill_id=_bill_id;
  SELECT total, status INTO bill_total, cur_status FROM public.bills WHERE id=_bill_id;
  IF bill_total IS NULL THEN RETURN; END IF;
  IF cur_status IN ('draft','void') THEN RETURN; END IF;
  IF paid <= 0 THEN new_status := 'open';
  ELSIF paid >= bill_total THEN new_status := 'paid';
  ELSE new_status := 'partial';
  END IF;
  IF new_status <> cur_status THEN UPDATE public.bills SET status=new_status WHERE id=_bill_id; END IF;
END $$;

-- Post journal for a bill (debit expense accts, credit AP)
CREATE OR REPLACE FUNCTION public.post_bill_journal(_bill_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD; ap_id uuid; def_exp uuid; eid uuid; line RECORD; total_lines numeric := 0;
BEGIN
  SELECT * INTO b FROM public.bills WHERE id=_bill_id;
  IF b IS NULL OR b.status IN ('draft','void') THEN RETURN; END IF;
  ap_id := public.find_account(b.user_id,'2000');
  def_exp := public.find_account(b.user_id,'7900');
  IF ap_id IS NULL OR def_exp IS NULL THEN RETURN; END IF;
  INSERT INTO public.journal_entries(user_id,entry_date,reference,memo,source_type,source_id,is_posted)
    VALUES (b.user_id,b.issue_date,b.bill_number,'Bill from vendor','bill',b.id,true)
    RETURNING id INTO eid;
  FOR line IN SELECT * FROM public.bill_items WHERE bill_id=_bill_id LOOP
    INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
      VALUES (b.user_id,eid,COALESCE(line.account_id,def_exp),line.amount,0,line.description);
    total_lines := total_lines + line.amount;
  END LOOP;
  -- Tax (if any) → tax expense fallback default_exp
  IF b.tax > 0 THEN
    INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
      VALUES (b.user_id,eid,def_exp,b.tax,0,'Tax');
    total_lines := total_lines + b.tax;
  END IF;
  INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
    VALUES (b.user_id,eid,ap_id,0,total_lines,'Accounts payable');
END $$;

CREATE OR REPLACE FUNCTION public.handle_bill_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    -- posting deferred until bill_items inserted; caller can re-run via update
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    DELETE FROM public.journal_entries WHERE source_type='bill' AND source_id=NEW.id;
    PERFORM public.post_bill_journal(NEW.id);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    DELETE FROM public.journal_entries WHERE source_type='bill' AND source_id=OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_bill_change AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.handle_bill_change();

-- Post journal for bill payment (debit AP, credit source acct)
CREATE OR REPLACE FUNCTION public.post_bill_payment_journal(_pay_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p RECORD; ap_id uuid; src_id uuid; eid uuid; bill_num text;
BEGIN
  SELECT * INTO p FROM public.bill_payments WHERE id=_pay_id;
  IF p IS NULL THEN RETURN; END IF;
  SELECT bill_number INTO bill_num FROM public.bills WHERE id=p.bill_id;
  ap_id := public.find_account(p.user_id,'2000');
  src_id := p.source_account_id;
  IF src_id IS NULL THEN src_id := public.find_account(p.user_id,'1010'); END IF;
  IF src_id IS NULL THEN src_id := public.find_account(p.user_id,'1000'); END IF;
  IF ap_id IS NULL OR src_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.journal_entries(user_id,entry_date,reference,memo,source_type,source_id,is_posted)
    VALUES (p.user_id,p.payment_date,'BPMT-'||bill_num,'Payment for bill '||bill_num,'bill_payment',p.id,true)
    RETURNING id INTO eid;
  INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
    VALUES (p.user_id,eid,ap_id,p.amount,0,'AP settlement');
  INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
    VALUES (p.user_id,eid,src_id,0,p.amount,'Bill payment ('||p.method||')');
END $$;

CREATE OR REPLACE FUNCTION public.handle_bill_payment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.post_bill_payment_journal(NEW.id);
    PERFORM public.recalc_bill_status(NEW.bill_id);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    DELETE FROM public.journal_entries WHERE source_type='bill_payment' AND source_id=NEW.id;
    PERFORM public.post_bill_payment_journal(NEW.id);
    PERFORM public.recalc_bill_status(NEW.bill_id);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    DELETE FROM public.journal_entries WHERE source_type='bill_payment' AND source_id=OLD.id;
    PERFORM public.recalc_bill_status(OLD.bill_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_bill_payment_change AFTER INSERT OR UPDATE OR DELETE ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_bill_payment_change();
