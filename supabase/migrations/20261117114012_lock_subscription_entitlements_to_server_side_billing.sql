-- Subscription entitlements must be written only by trusted billing webhooks
-- or server-side service-role code. Client-side writes would allow self-granted
-- paid plans/status values without a verified payment.

drop policy if exists "Users can create their own subscription" on public.subscriptions;
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "Users can view their own subscription" on public.subscriptions;

revoke all on table public.subscriptions from public, anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant all on table public.subscriptions to service_role;
