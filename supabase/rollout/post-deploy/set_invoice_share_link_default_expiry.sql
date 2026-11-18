-- Apply only after the application deployment includes invoice link management.
-- Existing rows remain NULL and retain their current public links.
ALTER TABLE public.invoices
  ALTER COLUMN share_token_expires_at
  SET DEFAULT (now() + interval '90 days');
