-- Deal -> Invoice conversion link. This is the core structural
-- differentiator vs. bolt-on CRM+accounting combos (QuickBooks+HubSpot,
-- Zoho CRM+Zoho Books): a won deal becomes the SAME invoice record,
-- not a synced copy in a second system. No sync lag, no duplicate
-- source of truth.
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
