-- The stock migration originally installed one trigger per event:
-- insert (AFTER), status update (AFTER), and delete (BEFORE).
-- A later migration also left a combined AFTER trigger on the same table.
-- That combined trigger invokes handle_invoice_stock a second time for
-- inserts/status updates and a third time for deletes. Keep the event-specific
-- triggers because the BEFORE DELETE timing is required: invoice_items must
-- still be available when stock is reversed.
DROP TRIGGER IF EXISTS trg_invoice_stock ON public.invoices;

-- New invoices are saved as drafts first so their line items can be inserted
-- before the status transition commits the sale. The previous handler ignored
-- status-only updates, so that transition did not reliably post the invoice
-- to the general ledger. Include status in the update comparison and post
-- non-draft invoices after their line items have been persisted.
CREATE OR REPLACE FUNCTION public.handle_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      PERFORM public.post_invoice_journal(NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (
      OLD.company_id,
      OLD.user_id,
      OLD.issue_date,
      OLD.invoice_number,
      OLD.total,
      OLD.base_currency_amount,
      OLD.status
    ) IS DISTINCT FROM (
      NEW.company_id,
      NEW.user_id,
      NEW.issue_date,
      NEW.invoice_number,
      NEW.total,
      NEW.base_currency_amount,
      NEW.status
    ) THEN
      DELETE FROM public.journal_entries
       WHERE company_id = OLD.company_id
         AND source_type = 'invoice'
         AND source_id = OLD.id;
      PERFORM public.post_invoice_journal(NEW.id);
    END IF;
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
