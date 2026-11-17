-- The public newsletter endpoint writes through the server-side service-role
-- client. Do not expose subscriber rows or broad UPDATE rights to browser roles.

drop policy if exists "Anyone can subscribe to the newsletter" on public.newsletter_subscribers;
drop policy if exists "Anyone can resubscribe via upsert" on public.newsletter_subscribers;

revoke all on table public.newsletter_subscribers from public, anon, authenticated;
grant all on table public.newsletter_subscribers to service_role;
