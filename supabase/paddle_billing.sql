-- FinFlow Paddle Billing schema.
-- Idempotent — safe to run multiple times.

-- ===== subscriptions =====
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  paddle_customer_id text,
  paddle_subscription_id text unique,
  price_id text,
  plan text not null default 'free' check (plan in ('free','professional','business','enterprise')),
  status text not null default 'active',
  billing_cycle text check (billing_cycle in ('monthly','yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_company_id_idx on public.subscriptions(company_id);
create index if not exists subscriptions_owner_id_idx on public.subscriptions(owner_id);

grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (
      company_id is not null
      and exists (
        select 1 from public.company_members m
        where m.company_id = subscriptions.company_id and m.user_id = auth.uid()
      )
    )
  );

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Updates happen server-side (webhook / cancel via service_role). No update policy for authenticated.

-- ===== customers =====
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete cascade,
  paddle_customer_id text unique,
  billing_email text,
  created_at timestamptz not null default now()
);

grant select on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;

drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      company_id is not null
      and exists (
        select 1 from public.company_members m
        where m.company_id = customers.company_id and m.user_id = auth.uid()
      )
    )
  );

-- ===== billing_events (webhook audit log, service_role only) =====
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  paddle_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

grant all on public.billing_events to service_role;
alter table public.billing_events enable row level security;
-- No policies for authenticated: only service_role writes/reads.

-- ===== updated_at trigger =====
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.tg_touch_updated_at();

-- ===== helper: active plan for a company (used by server-side gating if desired) =====
create or replace function public.get_active_plan(_company_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select plan from public.subscriptions
      where company_id = _company_id
        and status in ('active','trialing')
      order by updated_at desc limit 1),
    'free'
  )
$$;

grant execute on function public.get_active_plan(uuid) to authenticated;
