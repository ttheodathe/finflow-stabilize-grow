-- The default chart-of-accounts RPC is an authenticated onboarding operation.
-- Its auth.uid() guard already prevents anonymous writes; remove unnecessary
-- anon EXECUTE exposure and pin its non-definer search path.
REVOKE ALL ON FUNCTION public.seed_default_accounts(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_accounts(uuid, uuid) TO authenticated;
ALTER FUNCTION public.seed_default_accounts(uuid, uuid) SET search_path = '';
