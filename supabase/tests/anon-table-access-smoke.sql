\set ON_ERROR_STOP on
DO $$
BEGIN
  IF NOT has_table_privilege('anon','public.permissions','SELECT')
     OR NOT has_table_privilege('anon','public.subscription_plans','SELECT')
     OR NOT has_table_privilege('anon','public.testimonials','SELECT')
     OR NOT has_table_privilege('anon','public.testimonials','INSERT') THEN
    RAISE EXCEPTION 'required anonymous public-data privileges were removed';
  END IF;

  IF has_table_privilege('anon','public.invoices','SELECT')
     OR has_table_privilege('anon','public.expenses','SELECT')
     OR has_table_privilege('anon','public.journal_entries','SELECT')
     OR has_table_privilege('anon','public.profiles','SELECT')
     OR has_table_privilege('anon','public.company_members','SELECT')
     OR has_table_privilege('anon','public.partner_applications','SELECT')
     OR has_table_privilege('anon','public.billing_events','SELECT')
     OR has_table_privilege('anon','public.newsletter_subscribers','SELECT')
     OR has_table_privilege('anon','public.user_company_preferences','SELECT') THEN
    RAISE EXCEPTION 'anonymous access remains on a protected tenant, billing, newsletter, or preference table';
  END IF;

  IF has_table_privilege('anon','public.invoices','INSERT')
     OR has_table_privilege('anon','public.invoices','UPDATE')
     OR has_table_privilege('anon','public.invoices','DELETE')
     OR has_table_privilege('anon','public.testimonials','UPDATE')
     OR has_table_privilege('anon','public.testimonials','DELETE')
     OR has_table_privilege('anon','public.billing_events','INSERT')
     OR has_table_privilege('anon','public.billing_events','UPDATE')
     OR has_table_privilege('anon','public.billing_events','DELETE')
     OR has_table_privilege('anon','public.newsletter_subscribers','INSERT')
     OR has_table_privilege('anon','public.newsletter_subscribers','UPDATE')
     OR has_table_privilege('anon','public.newsletter_subscribers','DELETE')
     OR has_table_privilege('anon','public.user_company_preferences','INSERT')
     OR has_table_privilege('anon','public.user_company_preferences','UPDATE')
     OR has_table_privilege('anon','public.user_company_preferences','DELETE') THEN
    RAISE EXCEPTION 'anonymous write privileges exceed the approved testimonial insert';
  END IF;

  IF NOT has_table_privilege('authenticated','public.invoices','SELECT')
     OR NOT has_table_privilege('authenticated','public.invoices','INSERT')
     OR NOT has_table_privilege('authenticated','public.invoices','UPDATE')
     OR NOT has_table_privilege('authenticated','public.invoices','DELETE') THEN
    RAISE EXCEPTION 'authenticated invoice privileges were unexpectedly changed';
  END IF;
END;
$$;

CREATE TABLE public.future_table_after_migration (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
DO $$
BEGIN
  IF has_table_privilege('anon','public.future_table_after_migration','SELECT')
     OR has_table_privilege('anon','public.future_table_after_migration','INSERT') THEN
    RAISE EXCEPTION 'future public tables inherit anonymous privileges';
  END IF;
END;
$$;

SELECT 'anonymous table privilege regression tests passed' AS result;
