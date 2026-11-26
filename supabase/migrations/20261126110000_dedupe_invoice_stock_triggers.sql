-- The stock migration originally installed one trigger per event:
-- insert (AFTER), status update (AFTER), and delete (BEFORE).
-- A later migration also left a combined AFTER trigger on the same table.
-- That combined trigger invokes handle_invoice_stock a second time for
-- inserts/status updates and a third time for deletes. Keep the event-specific
-- triggers because the BEFORE DELETE timing is required: invoice_items must
-- still be available when stock is reversed.
DROP TRIGGER IF EXISTS trg_invoice_stock ON public.invoices;
