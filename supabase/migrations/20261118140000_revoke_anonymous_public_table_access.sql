-- Anonymous clients only need read access to public reference/marketing data
-- and insert access to unapproved testimonials. Tenant financial and identity
-- tables must never be directly queryable by the anon API role.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON TABLE public.permissions, public.subscription_plans, public.testimonials TO anon;
GRANT INSERT ON TABLE public.testimonials TO anon;

-- Prevent future postgres-owned public tables from inheriting anonymous access.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
