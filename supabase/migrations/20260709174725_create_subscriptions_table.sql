-- Subscriptions / plan table (created if it doesn't already exist)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','business','enterprise')),
  company_limit integer, -- null = unlimited (enterprise)
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.subscriptions enable row level security;

-- Users can see their own plan
drop policy if exists "Users can view their own subscription" on public.subscriptions;
create policy "Users can view their own subscription"
on public.subscriptions for select
using (auth.uid() = user_id);

-- Safety-net insert: lets the client create a default row for itself if one
-- is somehow missing (e.g. accounts created before this migration existed).
-- New signups get a row automatically via the trigger below.
drop policy if exists "Users can create their own subscription" on public.subscriptions;
create policy "Users can create their own subscription"
on public.subscriptions for insert
with check (auth.uid() = user_id);

-- Note: intentionally no UPDATE policy for regular users. Plan changes must
-- go through the update_own_plan() RPC below (or, later, a billing webhook
-- using the service role), so a user can't just edit their row to grant
-- themselves a higher tier.

-- Keep updated_at fresh (reuses the existing set_updated_at() function)
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Auto-create a free subscription row whenever a new user signs up
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.subscriptions (user_id, plan, company_limit)
  values (new.id, 'free', 1)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
after insert on auth.users
for each row execute function public.handle_new_user_subscription();

-- Backfill: give existing users (like your own account) a default free row
insert into public.subscriptions (user_id, plan, company_limit)
select id, 'free', 1 from auth.users
on conflict (user_id) do nothing;

-- RPC to change your own plan safely (enforces valid tiers + correct limits).
-- Swap the body for a real billing-webhook-driven update once Stripe/Flutterwave is wired in.
create or replace function public.update_own_plan(new_plan text)
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

  update public.subscriptions
  set plan = new_plan,
      company_limit = case when new_plan = 'enterprise' then null else (limits->>new_plan)::integer end
  where user_id = auth.uid()
  returning * into result;

  if result is null then
    insert into public.subscriptions (user_id, plan, company_limit)
    values (
      auth.uid(),
      new_plan,
      case when new_plan = 'enterprise' then null else (limits->>new_plan)::integer end
    )
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.update_own_plan(text) to authenticated;
