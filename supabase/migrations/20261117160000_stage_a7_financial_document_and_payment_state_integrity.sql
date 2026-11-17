-- Stage A.7: enforce financial document line-item ownership and payment-backed settlement.
-- Historical rows are intentionally not rewritten by this migration.

CREATE OR REPLACE FUNCTION public.validate_financial_document_line_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  parent_company_id uuid;
  parent_user_id uuid;
  referenced_company_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'invoice_items' THEN
    SELECT company_id, user_id INTO parent_company_id, parent_user_id
      FROM public.invoices WHERE id = NEW.invoice_id FOR KEY SHARE;
  ELSIF TG_TABLE_NAME = 'bill_items' THEN
    SELECT company_id, user_id INTO parent_company_id, parent_user_id
      FROM public.bills WHERE id = NEW.bill_id FOR KEY SHARE;
  ELSIF TG_TABLE_NAME = 'estimate_items' THEN
    SELECT company_id, user_id INTO parent_company_id, parent_user_id
      FROM public.estimates WHERE id = NEW.estimate_id FOR KEY SHARE;
  ELSIF TG_TABLE_NAME = 'purchase_order_items' THEN
    SELECT company_id, user_id INTO parent_company_id, parent_user_id
      FROM public.purchase_orders WHERE id = NEW.po_id FOR KEY SHARE;
  ELSE
    RAISE EXCEPTION 'Unsupported financial line-item table: %', TG_TABLE_NAME
      USING ERRCODE = '22023';
  END IF;

  IF parent_company_id IS NULL THEN
    RAISE EXCEPTION 'Financial document parent does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.company_id IS DISTINCT FROM parent_company_id THEN
    RAISE EXCEPTION 'Line item company must match its parent document'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.user_id IS DISTINCT FROM parent_user_id THEN
    RAISE EXCEPTION 'Line item owner must match its parent document'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0
     OR NEW.unit_price IS NULL OR NEW.unit_price < 0
     OR NEW.amount IS NULL OR NEW.amount < 0
     OR (NEW.tax_rate IS NOT NULL AND NEW.tax_rate < 0) THEN
    RAISE EXCEPTION 'Financial line item quantity, price, amount and tax rate are invalid'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.item_id IS NOT NULL THEN
    SELECT company_id INTO referenced_company_id
      FROM public.items WHERE id = NEW.item_id FOR KEY SHARE;
    IF referenced_company_id IS NULL OR referenced_company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Catalog item must belong to the same company as the financial document'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_TABLE_NAME IN ('bill_items', 'purchase_order_items')
     AND NEW.account_id IS NOT NULL THEN
    SELECT company_id INTO referenced_company_id
      FROM public.accounts WHERE id = NEW.account_id FOR KEY SHARE;
    IF referenced_company_id IS NULL OR referenced_company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Account must belong to the same company as the financial document'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_financial_document_line_item() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_invoice_item_parent_integrity ON public.invoice_items;
CREATE TRIGGER validate_invoice_item_parent_integrity
  BEFORE INSERT OR UPDATE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_document_line_item();

DROP TRIGGER IF EXISTS validate_bill_item_parent_integrity ON public.bill_items;
CREATE TRIGGER validate_bill_item_parent_integrity
  BEFORE INSERT OR UPDATE ON public.bill_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_document_line_item();

DROP TRIGGER IF EXISTS validate_estimate_item_parent_integrity ON public.estimate_items;
CREATE TRIGGER validate_estimate_item_parent_integrity
  BEFORE INSERT OR UPDATE ON public.estimate_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_document_line_item();

DROP TRIGGER IF EXISTS validate_purchase_order_item_parent_integrity ON public.purchase_order_items;
CREATE TRIGGER validate_purchase_order_item_parent_integrity
  BEFORE INSERT OR UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_document_line_item();

CREATE OR REPLACE FUNCTION public.require_payment_backed_paid_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  recorded numeric;
BEGIN
  IF NEW.status = 'paid'
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.total IS DISTINCT FROM NEW.total
     ) THEN
    IF TG_TABLE_NAME = 'invoices' THEN
      SELECT COALESCE(SUM(amount), 0) INTO recorded
        FROM public.payments WHERE invoice_id = NEW.id;
      IF recorded + 0.000001 < NEW.total THEN
        RAISE EXCEPTION 'invoice_payment_required: recorded payments must cover the invoice total before marking it paid'
          USING ERRCODE = '23514';
      END IF;
    ELSIF TG_TABLE_NAME = 'bills' THEN
      SELECT COALESCE(SUM(amount), 0) INTO recorded
        FROM public.bill_payments WHERE bill_id = NEW.id;
      IF recorded + 0.000001 < NEW.total THEN
        RAISE EXCEPTION 'bill_payment_required: recorded bill payments must cover the bill total before marking it paid'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.require_payment_backed_paid_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS require_payment_backed_paid_invoice ON public.invoices;
CREATE TRIGGER require_payment_backed_paid_invoice
  BEFORE INSERT OR UPDATE OF status, total ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.require_payment_backed_paid_status();

DROP TRIGGER IF EXISTS require_payment_backed_paid_bill ON public.bills;
CREATE TRIGGER require_payment_backed_paid_bill
  BEFORE INSERT OR UPDATE OF status, total ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.require_payment_backed_paid_status();

COMMENT ON FUNCTION public.validate_financial_document_line_item()
  IS 'Enforces parent document, company, owner and referenced catalog/account ownership for financial line items.';
COMMENT ON FUNCTION public.require_payment_backed_paid_status()
  IS 'Requires recorded payment totals to cover the document total before a document can transition to paid.';
