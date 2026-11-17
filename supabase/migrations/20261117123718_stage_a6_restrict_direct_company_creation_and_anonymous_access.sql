-- Stage A.6: make company creation server-controlled and close anonymous table grants.
-- Company creation must go through create_company(), which enforces plan limits
-- and creates the owner membership, settings, chart of accounts and audit row.
REVOKE ALL ON TABLE public.companies FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.companies TO authenticated;
GRANT UPDATE (
  name, email, address, currency, phone, website, city, state,
  postal_code, country, tax_number, logo_url
) ON TABLE public.companies TO authenticated;
