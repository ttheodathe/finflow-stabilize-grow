-- Stage A.7: harden intentionally public SECURITY DEFINER RPC search paths.
-- These token/RPC functions are deliberately callable by anon, but must not
-- resolve unqualified objects through a mutable schema search path.
-- All relations, auth helpers, and non-built-in types are schema-qualified.
ALTER FUNCTION public.get_public_invoice(uuid) SET search_path = '';
ALTER FUNCTION public.get_public_team_invitation(uuid) SET search_path = '';
ALTER FUNCTION public.submit_partner_application(
  public.partner_type, text, text, text, boolean, text, text, text, text,
  text, text, text, text, text, text[]
) SET search_path = '';
