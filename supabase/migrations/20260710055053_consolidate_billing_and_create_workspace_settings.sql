-- Consolidate plan tracking onto the single subscriptions table.
-- profiles.plan / billing_interval / plan_updated_at were an orphaned,
-- unused, second plan-tracking mechanism (nothing in the codebase reads
-- them) that conflicted with the subscriptions table. Fold the interval
-- concept into subscriptions and drop the duplicate columns from profiles.
alter table public.subscriptions
  add column if not exists billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly','annual'));

update public.subscriptions s
set billing_interval = coalesce(p.billing_interval, 'monthly'),
    plan = case
      -- migrate any old profiles.plan values using the old id scheme
      when p.plan = 'starter' then 'free'
      when p.plan = 'business' then 'pro'
      when p.plan = 'growth' then 'business'
      when p.plan = 'enterprise' then 'enterprise'
      else s.plan
    end
from public.profiles p
where p.id = s.user_id and p.plan is not null;

alter table public.profiles
  drop column if exists plan,
  drop column if exists billing_interval,
  drop column if exists plan_updated_at;

-- Replace update_own_plan to also accept a billing interval.
create or replace function public.update_own_plan(new_plan text, new_interval text default 'monthly')
returns public.subscriptions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  limits jsonb := '{"free":1,"pro":3,"business":10}'::jsonb;
  result public.subscriptions;
begin
  if new_plan not in ('free','pro','business','enterprise') then
    raise exception 'Invalid plan: %', new_plan;
  end if;
  if new_interval not in ('monthly','annual') then
    raise exception 'Invalid billing interval: %', new_interval;
  end if;

  update public.subscriptions
  set plan = new_plan,
      billing_interval = new_interval,
      company_limit = case when new_plan = 'enterprise' then null else (limits->>new_plan)::integer end
  where user_id = auth.uid()
  returning * into result;

  if result is null then
    insert into public.subscriptions (user_id, plan, billing_interval, company_limit)
    values (
      auth.uid(),
      new_plan,
      new_interval,
      case when new_plan = 'enterprise' then null else (limits->>new_plan)::integer end
    )
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.update_own_plan(text, text) to authenticated;

-- Workspace settings table for the Settings module (workspace, invoicing,
-- notification preferences). One row per user, mirroring the
-- subscriptions table's shape/conventions.
create table if not exists public.workspace_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_name text not null default '',
  logo_url text,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  date_format text not null default 'MM/DD/YYYY'
    check (date_format in ('MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD')),
  invoice_prefix text not null default 'INV-',
  invoice_next_number integer not null default 1,
  default_payment_terms_days integer not null default 14,
  default_invoice_notes text,
  notify_payment_received boolean not null default true,
  notify_invoice_overdue boolean not null default true,
  notify_weekly_summary boolean not null default false,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_settings enable row level security;

drop policy if exists "Users can view their own workspace settings" on public.workspace_settings;
create policy "Users can view their own workspace settings"
on public.workspace_settings for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workspace settings" on public.workspace_settings;
create policy "Users can insert their own workspace settings"
on public.workspace_settings for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspace settings" on public.workspace_settings;
create policy "Users can update their own workspace settings"
on public.workspace_settings for update
using (auth.uid() = user_id);

drop trigger if exists trg_workspace_settings_updated on public.workspace_settings;
create trigger trg_workspace_settings_updated
before update on public.workspace_settings
for each row execute function public.set_updated_at();

-- Auto-create default workspace settings on signup, seeded from the
-- company name/currency where available so it isn't blank on first load.
create or replace function public.handle_new_user_workspace_settings()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.workspace_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workspace_settings on auth.users;
create trigger on_auth_user_created_workspace_settings
after insert on auth.users
for each row execute function public.handle_new_user_workspace_settings();

-- Backfill existing users
insert into public.workspace_settings (user_id, workspace_name, currency)
select u.id, coalesce(c.name, ''), coalesce(c.currency, 'USD')
from auth.users u
left join lateral (
  select name, currency from public.companies where user_id = u.id order by created_at limit 1
) c on true
on conflict (user_id) do nothing;
