-- This legacy helper is not used by the client. Keep plan visibility behind
-- the membership-scoped plan/seat APIs and trusted server-side code.
revoke all on function public.get_active_plan(uuid) from public, anon, authenticated;
