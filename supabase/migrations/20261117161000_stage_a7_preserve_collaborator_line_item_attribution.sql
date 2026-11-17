-- Preserve collaborator attribution on line items.
-- user_id identifies the actor who created a line item; it need not equal the
-- original creator of a shared company document. Tenant isolation is enforced
-- by company_id and the parent-document relationship, not by matching creators.

CREATE OR REPLACE FUNCTION public.validate_financial_document_line_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  parent_company_id uuid;
  referenced_company_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'invoice_items' THEN
    SELECT company_id INTO parent_company_id
      FROM public.invoices WHERE id = NEW.invoice_id FOR KEY SHARE;
  ELSIF TG_TABLE_NAME = 'bill_items' THEN
    SELECT company_id INTO parent_company_id
      FROM public.bills WHERE id = NEW.bill_id FOR KEY SHARE;
  ELSIF TG_TABLE_NAME = 'estimate_items' THEN
    SELECT company_id INTO parent_company_id
      FROM public.estimates WHERE id = NEW.estimate_id FOR KEY SHARE;
  ELSIF TG_TABLE_NAME = 'purchase_order_items' THEN
    SELECT company_id INTO parent_company_id
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

COMMENT ON FUNCTION public.validate_financial_document_line_item()
  IS 'Enforces parent document and company ownership for financial line items while preserving collaborator attribution in user_id.';
