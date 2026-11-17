-- Referral code generation is an internal helper called by the staff-only
-- approve_partner_application SECURITY DEFINER RPC, not a public API.
REVOKE ALL ON FUNCTION public.generate_partner_referral_code(text) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.generate_partner_referral_code(text) SET search_path = '';
