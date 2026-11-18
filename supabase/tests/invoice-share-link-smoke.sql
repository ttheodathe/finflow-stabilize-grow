\\set ON_ERROR_STOP on
BEGIN;

-- Legacy token is preserved and remains accessible because its expiry/revocation
-- fields are NULL after the migration.
DO $$
DECLARE
  payload jsonb;
BEGIN
  payload := public.get_public_invoice('00000000-0000-0000-0000-000000000004');
  IF payload IS NULL OR payload->>'invoice_number' <> 'INV-LEGACY' THEN
    RAISE EXCEPTION 'legacy invoice link was not preserved';
  END IF;

  IF (SELECT share_token_expires_at IS NOT NULL OR share_token_revoked_at IS NOT NULL
      FROM public.invoices
      WHERE id = '00000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'legacy invoice link was assigned a lifecycle date during migration';
  END IF;
END;
$$;

-- Revocation immediately invalidates the old bearer link.
UPDATE public.invoices
SET share_token_revoked_at = now()
WHERE id = '00000000-0000-0000-0000-000000000003';

DO $$
BEGIN
  IF public.get_public_invoice('00000000-0000-0000-0000-000000000004') IS NOT NULL THEN
    RAISE EXCEPTION 'revoked invoice link remains accessible';
  END IF;
END;
$$;

-- Regeneration replaces the bearer token, clears revocation, and gives the new
-- token a 90-day expiry. The old token must stay invalid.
UPDATE public.invoices
SET share_token = '00000000-0000-0000-0000-000000000005',
    share_token_revoked_at = NULL,
    share_token_expires_at = now() + interval '90 days'
WHERE id = '00000000-0000-0000-0000-000000000003';

DO $$
BEGIN
  IF public.get_public_invoice('00000000-0000-0000-0000-000000000004') IS NOT NULL THEN
    RAISE EXCEPTION 'old invoice token remained valid after regeneration';
  END IF;
  IF public.get_public_invoice('00000000-0000-0000-0000-000000000005') IS NULL THEN
    RAISE EXCEPTION 'new invoice token is not accessible';
  END IF;
END;
$$;

-- Expired tokens are rejected.
UPDATE public.invoices
SET share_token_expires_at = now() - interval '1 second'
WHERE id = '00000000-0000-0000-0000-000000000003';

DO $$
BEGIN
  IF public.get_public_invoice('00000000-0000-0000-0000-000000000005') IS NOT NULL THEN
    RAISE EXCEPTION 'expired invoice token remains accessible';
  END IF;
END;
$$;

-- New invoice rows receive a 90-day expiry by default.
INSERT INTO public.invoices (
  company_id, customer_id, invoice_number, status, total
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'INV-NEW',
  'sent',
  50
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoice_number = 'INV-NEW'
      AND share_token_expires_at > now() + interval '89 days'
      AND share_token_expires_at < now() + interval '91 days'
  ) THEN
    RAISE EXCEPTION 'new invoice did not receive a 90-day share expiry';
  END IF;
END;
$$;

ROLLBACK;
SELECT 'invoice share link lifecycle tests passed' AS result;
