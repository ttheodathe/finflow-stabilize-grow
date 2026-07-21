-- Reconcile `public.subscriptions` with what the Paddle billing code
-- (src/lib/paddle/webhook.server.ts, src/routes/api/public/paddle/webhook.ts,
-- src/lib/billing.functions.ts) actually reads and writes.
--
-- Root cause this fixes: `supabase/paddle_billing.sql` was written to add
-- Paddle-specific columns (company_id, owner_id, paddle_subscription_id,
-- paddle_customer_id, price_id, billing_cycle, cancel_at_period_end) via
-- `create table if not exists public.subscriptions (...)`. Because
-- `subscriptions` already existed (from
-- 20260709174725_create_subscriptions_table.sql, keyed by user_id only),
-- that statement was always a silent no-op — the extra columns were never
-- added, and the file was never turned into a tracked, timestamped
-- migration, so it was never guaranteed to run at all. As a result every
-- Paddle webhook write and every getMySubscription/createFreeSubscription
-- call was targeting columns that don't exist on the live table.
--
-- This migration uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS against the
-- table as it actually exists today, so it's safe to run regardless of
-- what has or hasn't been applied before.
-- Idempotent — safe to run multiple times.

-- ===== subscriptions: add the columns the Paddle code depends on =====
alter table public.subscriptions
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists price_id text,
  add column if not exists billing_cycle text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_start timestamptz;

-- Backfill owner_id from the pre-existing user_id column so rows created
-- before this migration (e.g. via the signup trigger) are still findable
-- by the owner_id-based queries in billing.functions.ts.
update public.subscriptions
set owner_id = user_id
where owner_id is null;

-- billing_cycle should agree with the pre-existing billing_interval values
-- ('monthly'/'annual') where present, mapped to the Paddle vocabulary
-- ('monthly'/'yearly') used by config.ts's BillingCycle type.
update public.subscriptions
set billing_cycle = case billing_interval
  when 'annual' then 'yearly'
  else 'monthly'
end
where billing_cycle is null and billing_interval is not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_cycle_check;
alter table public.subscriptions
  add constraint subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly','yearly') or billing_cycle is null);

-- Normalize the plan check constraint to the app's actual PlanKey values.
-- (paddle_billing.sql, if it ran at all, would have used 'professional'
-- instead of 'pro', which never matched src/lib/paddle/config.ts.)
update public.subscriptions set plan = 'pro' where plan = 'professional';
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('free','pro','business','enterprise'));

-- paddle_subscription_id must be unique for the webhook's
-- `.upsert(row, { onConflict: "paddle_subscription_id" })` to work, but
-- allow many null values (free-plan rows with no Paddle subscription yet).
drop index if exists subscriptions_paddle_subscription_id_key;
create unique index subscriptions_paddle_subscription_id_key
  on public.subscriptions (paddle_subscription_id)
  where paddle_subscription_id is not null;

create index if not exists subscriptions_company_id_idx on public.subscriptions(company_id);
create index if not exists subscriptions_owner_id_idx on public.subscriptions(owner_id);

-- RLS: allow company-mates to see a subscription the same way
-- subscriptions_select_own already worked for owner_id = auth.uid().
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (
    owner_id = auth.uid()
    or user_id = auth.uid()
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
  with check (owner_id = auth.uid() or user_id = auth.uid());

grant all on public.subscriptions to service_role;

-- ===== customers (paddle_customer_id <-> app user/company mapping) =====
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

-- ===== billing_events (webhook idempotency + audit log, service_role only) =====
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

-- ===== helper used by server-side gating =====
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
