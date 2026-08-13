create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

-- No public policies: this table is only ever read/written via the service-role
-- client in the /api/public/newsletter/subscribe server route, never directly
-- from the browser.
