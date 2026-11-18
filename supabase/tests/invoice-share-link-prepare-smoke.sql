\\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  payload jsonb;
BEGIN
  payload := public.get_public_invoice('00000000-0000-0000-0000-000000000004');
  IF payload IS NULL OR payload->>'invoice_number' <> 'INV-LEGACY' THEN
    RAISE EXCEPTION 'legacy invoice link was not preserved during preparation';
  END IF;

  IF (SELECT share_token_expires_at IS NOT NULL OR share_token_revoked_at IS NOT NULL
      FROM public.invoices
      WHERE id = '00000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'legacy invoice link was assigned a lifecycle date during preparation';
  END IF;
END;
$$;

-- Before the UI is deployed, new invoices must not be assigned an expiry that
-- the old UI cannot manage.
INSERT INTO public.invoices (
  company_id, customer_id, invoice_number, status, total
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'INV-PRE-DEPLOY',
  'sent',
  50
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoice_number = 'INV-PRE-DEPLOY'
      AND share_token_expires_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'invoice expiry default was applied before the new UI deployment';
  END IF;
END;
$$;

ROLLBACK;
SELECT 'invoice share lifecycle preparation tests passed' AS result;
