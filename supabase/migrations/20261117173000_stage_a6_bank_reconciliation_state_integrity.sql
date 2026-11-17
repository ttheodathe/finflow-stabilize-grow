-- Stage A.6: make bank reconciliation timestamps and matching references database-owned.

CREATE OR REPLACE FUNCTION public.validate_bank_reconciliation_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  -- The database, not the browser/client, owns reconciliation timestamps.
  IF TG_OP = 'INSERT' THEN
    IF NEW.reconciled IS TRUE THEN
      NEW.reconciled_at := pg_catalog.now();
    ELSE
      NEW.reconciled_at := NULL;
    END IF;
  ELSE
    IF NEW.reconciled IS TRUE THEN
      IF OLD.reconciled IS TRUE THEN
        NEW.reconciled_at := OLD.reconciled_at;
        IF NEW.reconciled_at IS NULL THEN
          NEW.reconciled_at := pg_catalog.now();
        END IF;
      ELSE
        NEW.reconciled_at := pg_catalog.now();
      END IF;
    ELSE
      NEW.reconciled_at := NULL;
    END IF;
  END IF;

  IF NEW.matched_type IS NULL AND NEW.matched_id IS NOT NULL
     OR NEW.matched_type IS NOT NULL AND NEW.matched_id IS NULL THEN
    RAISE EXCEPTION 'Matched transaction type and reference must be supplied together';
  END IF;

  IF NEW.matched_type IS NOT NULL THEN
    IF NEW.matched_type = 'invoice' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.invoices i
         WHERE i.id = NEW.matched_id
           AND i.company_id = NEW.company_id
      ) THEN
        RAISE EXCEPTION 'Matched invoice must belong to the transaction company';
      END IF;
    ELSIF NEW.matched_type = 'bill' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.bills b
         WHERE b.id = NEW.matched_id
           AND b.company_id = NEW.company_id
      ) THEN
        RAISE EXCEPTION 'Matched bill must belong to the transaction company';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported bank transaction match type';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_bank_reconciliation_state() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_validate_bank_reconciliation_state ON public.bank_transactions;
CREATE TRIGGER trg_validate_bank_reconciliation_state
BEFORE INSERT OR UPDATE OF reconciled, reconciled_at, matched_type, matched_id, company_id
ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_bank_reconciliation_state();
