
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  max_companies int not null default 1,
  max_users int not null default 1,
  price_monthly numeric not null default 0,
  price_annual numeric not null default 0,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

create policy "anyone can view active plans"
  on public.subscription_plans for select
  using (is_active = true);

insert into public.subscription_plans (key, name, max_companies, max_users, price_monthly, price_annual, sort_order, features)
values
  ('free', 'Free', 1, 1, 0, 0, 1, '{"chart_of_accounts": true, "invoicing": true}'::jsonb),
  ('pro', 'Pro', 3, 5, 15, 150, 2, '{"chart_of_accounts": true, "invoicing": true, "banking": true, "inventory": true}'::jsonb),
  ('business', 'Business', 10, 20, 45, 450, 3, '{"chart_of_accounts": true, "invoicing": true, "banking": true, "inventory": true, "payroll": true, "reports": true}'::jsonb),
  ('enterprise', 'Enterprise', 999, 999, 150, 1500, 4, '{"chart_of_accounts": true, "invoicing": true, "banking": true, "inventory": true, "payroll": true, "reports": true, "priority_support": true}'::jsonb)
on conflict (key) do nothing;

-- link subscriptions to a plan row instead of only a free-text label
alter table public.subscriptions
  add column if not exists plan_id uuid references public.subscription_plans(id),
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

update public.subscriptions s
set plan_id = sp.id
from public.subscription_plans sp
where s.plan_id is null and sp.key = s.plan;

-- backfill organization_id on subscriptions from the org this user owns (if any)
update public.subscriptions s
set organization_id = o.id
from public.organizations o
where s.organization_id is null and o.owner_id = s.user_id;
