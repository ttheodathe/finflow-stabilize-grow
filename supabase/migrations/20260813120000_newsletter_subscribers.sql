-- Newsletter subscribers (footer signup form).
-- Written exclusively by the service-role client in
-- src/routes/api/public/newsletter/subscribe.ts — never from the browser.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

-- Data API grants: service_role only. anon/authenticated must NOT reach this
-- table directly (it holds email addresses).
grant all on public.newsletter_subscribers to service_role;

alter table public.newsletter_subscribers enable row level security;

-- No anon/authenticated policies on purpose: service_role bypasses RLS.

-- Public signup path: allow anonymous/authenticated INSERT + UPDATE of the
-- upsert row, but never SELECT (email addresses stay unreadable from clients).
grant insert, update on public.newsletter_subscribers to anon, authenticated;

drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe"
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (status = 'subscribed');

drop policy if exists "Anyone can resubscribe" on public.newsletter_subscribers;
create policy "Anyone can resubscribe"
  on public.newsletter_subscribers for update
  to anon, authenticated
  using (true)
  with check (status = 'subscribed');
