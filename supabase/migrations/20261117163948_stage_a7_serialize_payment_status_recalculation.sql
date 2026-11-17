-- Serialize concurrent payment mutations against their parent financial documents.
-- This prevents two simultaneous payments from calculating settlement against
-- stale snapshots and leaving a fully covered invoice/bill marked partial.
-- No historical payment, invoice, bill, or journal rows are rewritten.

CREATE OR REPLACE FUNCTION public.lock_invoice_for_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM i.id FROM public.invoices i WHERE i.id = NEW.invoice_id FOR UPDATE;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM i.id FROM public.invoices i WHERE i.id = OLD.invoice_id FOR UPDATE;
    RETURN OLD;
  ELSE
    -- Lock both parents in deterministic UUID order when a payment is moved.
    PERFORM i.id
      FROM public.invoices i
     WHERE i.id = ANY (ARRAY[OLD.invoice_id, NEW.invoice_id])
     ORDER BY i.id
     FOR UPDATE;
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_bill_for_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM b.id FROM public.bills b WHERE b.id = NEW.bill_id FOR UPDATE;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM b.id FROM public.bills b WHERE b.id = OLD.bill_id FOR UPDATE;
    RETURN OLD;
  ELSE
    -- Lock both parents in deterministic UUID order when a payment is moved.
    PERFORM b.id
      FROM public.bills b
     WHERE b.id = ANY (ARRAY[OLD.bill_id, NEW.bill_id])
     ORDER BY b.id
     FOR UPDATE;
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_invoice_for_payment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_bill_for_payment_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS serialize_invoice_payment_mutations ON public.payments;
CREATE TRIGGER serialize_invoice_payment_mutations
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.lock_invoice_for_payment_change();

DROP TRIGGER IF EXISTS serialize_bill_payment_mutations ON public.bill_payments;
CREATE TRIGGER serialize_bill_payment_mutations
  BEFORE INSERT OR UPDATE OR DELETE ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.lock_bill_for_payment_change();

CREATE OR REPLACE FUNCTION public.recalc_invoice_status(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  paid numeric;
  inv_total numeric;
  new_status text;
  cur_status text;
BEGIN
  -- Lock the parent before reading the payment aggregate. Payment mutations
  -- take the same lock in their BEFORE trigger, serializing all recalculation.
  SELECT total, status
    INTO inv_total, cur_status
    FROM public.invoices
   WHERE id = _invoice_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO paid
    FROM public.payments
   WHERE invoice_id = _invoice_id;

  IF paid <= 0 THEN
    IF cur_status IN ('paid', 'partial') THEN
      new_status := 'sent';
    ELSE
      new_status := cur_status;
    END IF;
  ELSIF paid >= inv_total THEN
    new_status := 'paid';
  ELSE
    new_status := 'partial';
  END IF;

  IF new_status IS DISTINCT FROM cur_status THEN
    UPDATE public.invoices SET status = new_status WHERE id = _invoice_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_bill_status(_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  paid numeric;
  bill_total numeric;
  cur_status text;
  new_status text;
BEGIN
  -- Lock the parent before reading the payment aggregate.
  SELECT total, status
    INTO bill_total, cur_status
    FROM public.bills
   WHERE id = _bill_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF cur_status IN ('draft', 'void') THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO paid
    FROM public.bill_payments
   WHERE bill_id = _bill_id;

  IF paid <= 0 THEN
    IF cur_status IN ('paid', 'partial') THEN
      new_status := 'open';
    ELSE
      new_status := cur_status;
    END IF;
  ELSIF paid >= bill_total THEN
    new_status := 'paid';
  ELSE
    new_status := 'partial';
  END IF;

  IF new_status IS DISTINCT FROM cur_status THEN
    UPDATE public.bills SET status = new_status WHERE id = _bill_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_invoice_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_bill_status(uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.recalc_invoice_status(uuid)
  IS 'Serializes settlement recalculation by locking the invoice before aggregating recorded payments.';
COMMENT ON FUNCTION public.recalc_bill_status(uuid)
  IS 'Serializes settlement recalculation by locking the bill before aggregating recorded payments.';
