-- Stage B2: expose only aggregate activation metrics to a dedicated login.
-- The reader cannot SELECT from source tables. A non-login view-owner role has
-- column-only source grants and explicit RLS policies; the private view returns
-- aggregate counts only and is not in a Supabase-exposed schema.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'seo_activation_aggregator') then
    create role seo_activation_aggregator;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'seo_activation_reader') then
    create role seo_activation_reader;
  end if;
end
$$;

alter role seo_activation_aggregator
  nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
alter role seo_activation_reader
  nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;

do $$
declare
  missing_tables text;
begin
  select string_agg(required.table_name, ', ')
    into missing_tables
  from (values
    ('profiles'),
    ('onboarding_progress'),
    ('invoices'),
    ('expenses')
  ) as required(table_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = required.table_name
      and c.relkind = 'r'
      and c.relrowsecurity
  );

  if missing_tables is not null then
    raise exception 'Stage B2 requires existing public tables with RLS enabled: %', missing_tables;
  end if;
end
$$;

create schema if not exists seo_private;
revoke all on schema seo_private from public;
grant usage, create on schema seo_private to seo_activation_aggregator;
grant usage on schema public to seo_activation_aggregator;

grant select (id, created_at)
  on public.profiles to seo_activation_aggregator;
grant select (user_id, completed_at)
  on public.onboarding_progress to seo_activation_aggregator;
grant select (user_id, created_at, status)
  on public.invoices to seo_activation_aggregator;
grant select (user_id, created_at)
  on public.expenses to seo_activation_aggregator;

drop policy if exists seo_activation_aggregate_access
  on public.profiles;
create policy seo_activation_aggregate_access
  on public.profiles
  for select to seo_activation_aggregator
  using (true);

drop policy if exists seo_activation_aggregate_access
  on public.onboarding_progress;
create policy seo_activation_aggregate_access
  on public.onboarding_progress
  for select to seo_activation_aggregator
  using (true);

drop policy if exists seo_activation_aggregate_access
  on public.invoices;
create policy seo_activation_aggregate_access
  on public.invoices
  for select to seo_activation_aggregator
  using (true);

drop policy if exists seo_activation_aggregate_access
  on public.expenses;
create policy seo_activation_aggregate_access
  on public.expenses
  for select to seo_activation_aggregator
  using (true);

create or replace view seo_private.activation_aggregate
with (security_invoker = false)
as
with registered as (
  select p.id, p.created_at
  from public.profiles p
  where p.created_at <= now()
),
onboarded as (
  select distinct o.user_id, o.completed_at
  from public.onboarding_progress o
  where o.completed_at is not null and o.completed_at <= now()
),
actions as (
  select i.user_id, i.created_at, (i.created_at at time zone 'UTC')::date as action_day
  from public.invoices i
  where i.created_at <= now()
    and lower(coalesce(i.status, '')) not in ('void', 'voided', 'cancelled', 'canceled', 'reversed', 'deleted')
  union all
  select e.user_id, e.created_at, (e.created_at at time zone 'UTC')::date as action_day
  from public.expenses e
  where e.created_at <= now()
),
activated as (
  select distinct a.user_id
  from actions a
  join onboarded o on o.user_id = a.user_id
  join registered r on r.id = a.user_id
  where o.completed_at >= r.created_at
    and a.created_at >= o.completed_at
    and a.created_at >= r.created_at
),
returning_all_time as (
  select a.user_id
  from actions a
  join onboarded o on o.user_id = a.user_id
  join registered r on r.id = a.user_id
  where o.completed_at >= r.created_at
    and a.created_at >= o.completed_at
    and a.created_at >= r.created_at
  group by a.user_id
  having count(distinct a.action_day) >= 2
),
new_registered as (
  select r.id, r.created_at
  from registered r
  where r.created_at >= now() - interval '30 days'
),
new_onboarded as (
  select distinct nr.id
  from new_registered nr
  join onboarded o on o.user_id = nr.id and o.completed_at >= nr.created_at
),
new_activated as (
  select distinct nr.id
  from new_registered nr
  join onboarded o on o.user_id = nr.id and o.completed_at >= nr.created_at
  join actions a on a.user_id = nr.id and a.created_at >= o.completed_at and a.created_at >= nr.created_at
),
new_returning as (
  select a.user_id
  from actions a
  join new_registered nr on nr.id = a.user_id and a.created_at >= nr.created_at
  join onboarded o on o.user_id = nr.id and o.completed_at >= nr.created_at
  where a.created_at >= o.completed_at
  group by a.user_id
  having count(distinct a.action_day) >= 2
)
select
  now() as source_watermark,
  (select count(*) from registered) as registered_users_all_time,
  (select count(*) from onboarded o join registered r on r.id = o.user_id and o.completed_at >= r.created_at) as onboarding_completions_all_time,
  (select count(*) from activated) as activated_users_all_time,
  (select count(*) from returning_all_time) as returning_activated_users_all_time,
  (select count(*) from new_registered) as new_registrations_30d,
  (select count(*) from new_onboarded) as new_onboarding_completions_30d,
  (select count(*) from new_activated) as new_activated_users_30d,
  (select count(*) from new_returning) as new_returning_activated_users_30d;

alter view seo_private.activation_aggregate owner to seo_activation_aggregator;
revoke create on schema seo_private from seo_activation_aggregator;
revoke all on schema seo_private from public;
grant usage on schema seo_private to seo_activation_reader;
revoke all on seo_private.activation_aggregate from public;
grant select on seo_private.activation_aggregate to seo_activation_reader;

-- The login is deliberately left disabled. After review, an operator may set
-- a unique password and LOGIN for seo_activation_reader; do not grant role
-- membership or source-table privileges to that login.
