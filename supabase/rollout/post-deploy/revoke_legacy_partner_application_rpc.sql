-- Apply only after the application deployment routes submissions through
-- /api/partners/submit-application. This is intentionally separate from the
-- preparation migration to avoid breaking the currently deployed public form.
REVOKE ALL ON FUNCTION public.submit_partner_application(
  public.partner_type, text, text, text, boolean, text, text, text, text,
  text, text, text, text, text, text[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_partner_application(
  public.partner_type, text, text, text, boolean, text, text, text, text,
  text, text, text, text, text, text[]
) TO service_role;
