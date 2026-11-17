-- Payment-provider webhook payloads are internal processing data.
-- The table has no user-facing RLS policies; restrict it to service_role.

revoke all on table public.billing_events from public, anon, authenticated;
grant all on table public.billing_events to service_role;
