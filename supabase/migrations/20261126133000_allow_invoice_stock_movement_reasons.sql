-- Keep stock movement reason validation while supporting all invoice
-- statuses that commit inventory in handle_invoice_stock().
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_reason_check;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_reason_check
  CHECK (
    reason = ANY (ARRAY[
      'invoice_paid'::text,
      'invoice_sent'::text,
      'invoice_partial'::text,
      'invoice_overdue'::text,
      'invoice_reversed'::text,
      'invoice_deleted'::text,
      'receipt'::text,
      'dispatch'::text,
      'transfer_out'::text,
      'transfer_in'::text,
      'cycle_count'::text,
      'damaged'::text,
      'lost'::text,
      'found'::text,
      'correction'::text,
      'return_in'::text,
      'return_out'::text
    ])
  );
