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

-- Invoice dispatches can be recorded with reasons such as invoice_sent,
-- invoice_paid or invoice_overdue. Reverse every linked dispatch journal entry
-- by its movement reference, not by assuming a single reason value.
CREATE OR REPLACE FUNCTION public.apply_invoice_stock(
  _invoice_id uuid,
  _direction integer,
  _reason text DEFAULT 'invoice_paid'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  r record;
  v_warehouse uuid;
BEGIN
  IF _direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invoice stock direction must be -1 or 1';
  END IF;

  FOR r IN
    SELECT
      ii.item_id,
      sum(ii.quantity) AS qty,
      i.user_id,
      i.company_id,
      i.invoice_number,
      it.default_warehouse_id
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    JOIN public.items it ON it.id = ii.item_id
    WHERE ii.invoice_id = _invoice_id
      AND ii.item_id IS NOT NULL
      AND it.type = 'product'
      AND it.track_inventory = true
      AND it.company_id = i.company_id
    GROUP BY
      ii.item_id,
      i.user_id,
      i.company_id,
      i.invoice_number,
      it.default_warehouse_id
  LOOP
    v_warehouse := r.default_warehouse_id;
    IF v_warehouse IS NULL THEN
      SELECT id
        INTO v_warehouse
        FROM public.warehouses
       WHERE company_id = r.company_id
         AND is_default
       ORDER BY id
       LIMIT 1;
    END IF;
    CONTINUE WHEN v_warehouse IS NULL;

    IF _direction > 0 THEN
      PERFORM public.dispatch_stock(
        r.company_id,
        r.user_id,
        r.item_id,
        v_warehouse,
        r.qty,
        _reason,
        NULL,
        NULL,
        'Invoice ' || r.invoice_number,
        _invoice_id,
        'invoice',
        _invoice_id
      );
    ELSE
      PERFORM public.record_stock_movement(
        r.company_id,
        r.user_id,
        r.item_id,
        v_warehouse,
        r.qty,
        _reason,
        NULL,
        'Invoice ' || r.invoice_number,
        _invoice_id,
        'invoice',
        _invoice_id
      );

      DELETE FROM public.journal_entries
       WHERE company_id = r.company_id
         AND source_type = 'stock_movement_dispatch'
         AND source_id IN (
           SELECT sm.id
             FROM public.stock_movements sm
            WHERE sm.company_id = r.company_id
              AND sm.invoice_id = _invoice_id
              AND sm.item_id = r.item_id
              AND sm.quantity_change < 0
         );
    END IF;
  END LOOP;
END;
$function$;
