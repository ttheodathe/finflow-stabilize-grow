-- Synthetic source tables for the Stage B2 read-only aggregate-view test.
-- This file is CI-only and must never be applied to production.
create table public.profiles (
  id uuid primary key,
  created_at timestamptz not null
);
create table public.onboarding_progress (
  user_id uuid primary key,
  completed_at timestamptz
);
create table public.invoices (
  id uuid primary key,
  user_id uuid not null,
  created_at timestamptz not null,
  status text
);
create table public.expenses (
  id uuid primary key,
  user_id uuid not null,
  created_at timestamptz not null
);

alter table public.profiles enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

insert into public.profiles(id, created_at) values
  ('51000000-0000-4000-8000-000000000001', now() - interval '10 days'),
  ('51000000-0000-4000-8000-000000000002', now() - interval '40 days'),
  ('51000000-0000-4000-8000-000000000003', now() - interval '5 days'),
  ('51000000-0000-4000-8000-000000000004', now() - interval '3 days');

insert into public.onboarding_progress(user_id, completed_at) values
  ('51000000-0000-4000-8000-000000000001', now() - interval '9 days'),
  ('51000000-0000-4000-8000-000000000002', now() - interval '39 days'),
  ('51000000-0000-4000-8000-000000000003', null),
  ('51000000-0000-4000-8000-000000000004', now() - interval '2 days');

insert into public.invoices(id, user_id, created_at, status) values
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', now() - interval '8 days', 'draft'),
  ('52000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', now() - interval '38 days', 'paid'),
  ('52000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000003', now() - interval '4 days', 'sent'),
  ('52000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000004', now() - interval '1 day', 'void');

insert into public.expenses(id, user_id, created_at) values
  ('53000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', now() - interval '7 days');
