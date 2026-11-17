-- Keep company identity/ownership fields out of direct authenticated updates.
-- Business profile fields remain editable through the Company Settings UI.
REVOKE UPDATE ON TABLE public.companies FROM PUBLIC, anon, authenticated;
GRANT UPDATE (
  name,
  email,
  address,
  currency,
  phone,
  website,
  city,
  state,
  postal_code,
  country,
  tax_number,
  logo_url
) ON TABLE public.companies TO authenticated;
