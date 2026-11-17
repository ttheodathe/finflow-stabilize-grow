-- Stage A.6: enforce parent/tenant integrity for payment and bank-ledger rows.
CREATE OR REPLACE FUNCTION public.validate_payment_tenant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_parent record;
BEGIN
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Payment company is required';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0
     OR NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0
     OR (NEW.base_currency_amount IS NOT NULL AND NEW.base_currency_amount <= 0) THEN
    RAISE EXCEPTION 'Payment amount and exchange rate must be positive';
  END IF;

  IF TG_TABLE_NAME = 'payments' THEN
    SELECT i.company_id, i.currency, i.customer_id
      INTO v_parent
      FROM public.invoices i
     WHERE i.id = NEW.invoice_id
     FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice does not exist';
    END IF;
    IF v_parent.company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Payment and invoice must belong to the same company';
    END IF;
    IF v_parent.currency IS DISTINCT FROM NEW.currency THEN
      RAISE EXCEPTION 'Payment currency must match invoice currency';
    END IF;
    IF NEW.customer_id IS NULL THEN
      NEW.customer_id := v_parent.customer_id;
    ELSIF v_parent.customer_id IS NOT NULL
       AND NEW.customer_id IS DISTINCT FROM v_parent.customer_id THEN
      RAISE EXCEPTION 'Payment customer must match invoice customer';
    END IF;
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.customers c
       WHERE c.id = NEW.customer_id AND c.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Payment customer does not belong to this company';
    END IF;
    IF NEW.deposit_account_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.deposit_account_id IS DISTINCT FROM OLD.deposit_account_id
            OR NEW.company_id IS DISTINCT FROM OLD.company_id)
       AND NOT EXISTS (
      SELECT 1 FROM public.accounts a
       WHERE a.id = NEW.deposit_account_id
         AND a.company_id = NEW.company_id
         AND a.is_active = true
         AND a.type = 'asset'
    ) THEN
      RAISE EXCEPTION 'Payment deposit account must be an active company asset account';
    END IF;

  ELSIF TG_TABLE_NAME = 'bill_payments' THEN
    SELECT b.company_id, b.currency, b.vendor_id
      INTO v_parent
      FROM public.bills b
     WHERE b.id = NEW.bill_id
     FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bill does not exist';
    END IF;
    IF v_parent.company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Bill payment and bill must belong to the same company';
    END IF;
    IF v_parent.currency IS DISTINCT FROM NEW.currency THEN
      RAISE EXCEPTION 'Bill payment currency must match bill currency';
    END IF;
    IF NEW.vendor_id IS NULL THEN
      NEW.vendor_id := v_parent.vendor_id;
    ELSIF v_parent.vendor_id IS NOT NULL
       AND NEW.vendor_id IS DISTINCT FROM v_parent.vendor_id THEN
      RAISE EXCEPTION 'Bill payment vendor must match bill vendor';
    END IF;
    IF NEW.vendor_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.vendors v
       WHERE v.id = NEW.vendor_id AND v.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Bill payment vendor does not belong to this company';
    END IF;
    IF NEW.source_account_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.source_account_id IS DISTINCT FROM OLD.source_account_id
            OR NEW.company_id IS DISTINCT FROM OLD.company_id)
       AND NOT EXISTS (
      SELECT 1 FROM public.accounts a
       WHERE a.id = NEW.source_account_id
         AND a.company_id = NEW.company_id
         AND a.is_active = true
         AND a.type = 'asset'
    ) THEN
      RAISE EXCEPTION 'Bill payment source account must be an active company asset account';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_payment_tenant_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_payment_tenant_integrity ON public.payments;
CREATE TRIGGER trg_validate_payment_tenant_integrity
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_tenant_integrity();

DROP TRIGGER IF EXISTS trg_validate_bill_payment_tenant_integrity ON public.bill_payments;
CREATE TRIGGER trg_validate_bill_payment_tenant_integrity
BEFORE INSERT OR UPDATE ON public.bill_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_tenant_integrity();

CREATE OR REPLACE FUNCTION public.validate_bank_transaction_tenant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF NEW.company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.bank_accounts ba
     WHERE ba.id = NEW.bank_account_id
       AND ba.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Bank transaction account must belong to the transaction company';
  END IF;

  IF NEW.category_account_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.category_account_id IS DISTINCT FROM OLD.category_account_id
          OR NEW.company_id IS DISTINCT FROM OLD.company_id)
     AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = NEW.category_account_id
       AND a.is_active = true
       AND (a.company_id = NEW.company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'Bank transaction category account is invalid for this company';
  END IF;

  IF NEW.bank_transfer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bank_transfers bt
     WHERE bt.id = NEW.bank_transfer_id
       AND bt.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Bank transfer reference does not belong to this company';
  END IF;

  IF NEW.is_transfer AND NEW.bank_transfer_id IS NULL THEN
    RAISE EXCEPTION 'Transfer transactions must reference a company-owned bank transfer';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_bank_transaction_tenant_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_bank_transaction_tenant_integrity ON public.bank_transactions;
CREATE TRIGGER trg_validate_bank_transaction_tenant_integrity
BEFORE INSERT OR UPDATE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_bank_transaction_tenant_integrity();

-- Scope journal replacement to the originating tenant, and recalculate both
-- invoices/bills when a payment is reassigned within the same tenant.
CREATE OR REPLACE FUNCTION public.handle_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.post_payment_journal(NEW.id);
    PERFORM public.recalc_invoice_status(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'payment'
       AND source_id = OLD.id;
    PERFORM public.post_payment_journal(NEW.id);
    IF OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
      PERFORM public.recalc_invoice_status(OLD.invoice_id);
    END IF;
    PERFORM public.recalc_invoice_status(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'payment'
       AND source_id = OLD.id;
    PERFORM public.recalc_invoice_status(OLD.invoice_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_bill_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.post_bill_payment_journal(NEW.id);
    PERFORM public.recalc_bill_status(NEW.bill_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'bill_payment'
       AND source_id = OLD.id;
    PERFORM public.post_bill_payment_journal(NEW.id);
    IF OLD.bill_id IS DISTINCT FROM NEW.bill_id THEN
      PERFORM public.recalc_bill_status(OLD.bill_id);
    END IF;
    PERFORM public.recalc_bill_status(NEW.bill_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'bill_payment'
       AND source_id = OLD.id;
    PERFORM public.recalc_bill_status(OLD.bill_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'invoice'
       AND source_id = OLD.id;
    PERFORM public.post_invoice_journal(NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'invoice'
       AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_bill_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'bill'
       AND source_id = OLD.id;
    PERFORM public.post_bill_journal(NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'bill'
       AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_invoice_stock(_invoice_id uuid, _direction integer, _reason text DEFAULT 'invoice_paid'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  r record;
  v_warehouse uuid;
BEGIN
  IF _direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invoice stock direction must be -1 or 1';
  END IF;

  FOR r IN
    SELECT ii.item_id, sum(ii.quantity) AS qty, i.user_id, i.company_id, i.invoice_number,
           it.default_warehouse_id
      FROM public.invoice_items ii
      JOIN public.invoices i ON i.id = ii.invoice_id
      JOIN public.items it ON it.id = ii.item_id
     WHERE ii.invoice_id = _invoice_id
       AND ii.item_id IS NOT NULL
       AND it.type = 'product'
       AND it.track_inventory = true
       AND it.company_id = i.company_id
     GROUP BY ii.item_id, i.user_id, i.company_id, i.invoice_number, it.default_warehouse_id
  LOOP
    v_warehouse := r.default_warehouse_id;
    IF v_warehouse IS NULL THEN
      SELECT id INTO v_warehouse FROM public.warehouses
       WHERE company_id = r.company_id AND is_default
       ORDER BY id LIMIT 1;
    END IF;
    CONTINUE WHEN v_warehouse IS NULL;

    IF _direction > 0 THEN
      PERFORM public.dispatch_stock(
        r.company_id, r.user_id, r.item_id, v_warehouse, r.qty, _reason,
        NULL, NULL, 'Invoice ' || r.invoice_number, _invoice_id, 'invoice', _invoice_id
      );
    ELSE
      PERFORM public.record_stock_movement(
        r.company_id, r.user_id, r.item_id, v_warehouse, r.qty, _reason,
        NULL, 'Invoice ' || r.invoice_number, _invoice_id, 'invoice', _invoice_id
      );
      DELETE FROM public.journal_entries
       WHERE company_id = r.company_id
         AND source_type = 'stock_movement_dispatch'
         AND source_id IN (
           SELECT sm.id FROM public.stock_movements sm
            WHERE sm.company_id = r.company_id
              AND sm.invoice_id = _invoice_id
              AND sm.item_id = r.item_id
              AND sm.reason = 'invoice_paid'
         );
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_payment_tenant_integrity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_bank_transaction_tenant_integrity() FROM PUBLIC, anon, authenticated;
