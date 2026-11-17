-- Keep invoice and bill status synchronized with their recorded payment totals.
-- This is forward-only behavior: historical document rows are not rewritten here.

CREATE OR REPLACE FUNCTION public.require_payment_backed_paid_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  recorded numeric;
BEGIN
  IF TG_TABLE_NAME = 'invoices' THEN
    SELECT COALESCE(SUM(amount), 0) INTO recorded
      FROM public.payments WHERE invoice_id = NEW.id;
  ELSIF TG_TABLE_NAME = 'bills' THEN
    SELECT COALESCE(SUM(amount), 0) INTO recorded
      FROM public.bill_payments WHERE bill_id = NEW.id;
  ELSE
    RAISE EXCEPTION 'Unsupported payment-status document: %', TG_TABLE_NAME
      USING ERRCODE = '22023';
  END IF;

  IF recorded + 0.000001 >= NEW.total THEN
    -- A fully covered document cannot be manually moved back to an open state.
    NEW.status := 'paid';
  ELSIF recorded > 0 THEN
    -- Partial settlement is derived from the payment ledger.
    NEW.status := 'partial';
  ELSIF NEW.status IN ('paid', 'partial') THEN
    RAISE EXCEPTION 'payment_required: paid and partial statuses must be backed by recorded payments'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.require_payment_backed_paid_status()
  IS 'Derives paid/partial invoice and bill states from recorded payment totals; blocks unsupported settlement states.';
