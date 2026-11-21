-- Stage E: expose only aggregate activation metrics to a dedicated reader.
-- The view is owned by the trusted Supabase postgres administrator, but lives
-- in an unexposed schema and is executable only by a dedicated NOLOGIN reader.
-- It returns counts and a watermark only; it never exposes user IDs or amounts.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'seo_activation_reader') then
    create role seo_activation_reader nologin noinherit;
  end if;

  -- PostgreSQL defaults newly created roles to non-superuser, no database/role
  -- creation, no replication, and no RLS bypass. Refuse pre-existing roles
  -- carrying any elevated attribute instead of attempting to modify it.
  if exists (
    select 1 from pg_roles
    where rolname = 'seo_activation_reader'
      and (rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls)
  ) then
    raise exception 'Stage E reader role already exists with elevated privileges';
  end if;
end;
$$;

alter role seo_activation_reader nologin noinherit;

-- Supabase automatically records its privileged migration actor as a member
-- of roles it creates. Permit only that admin membership; reject every other
-- membership that could let an application role assume the reader role.
do $$
begin
  if exists (
    select 1
    from pg_auth_members am
    join pg_roles granted_role on granted_role.oid = am.roleid
    join pg_roles member_role on member_role.oid = am.member
    where (
      granted_role.rolname = 'seo_activation_reader'
      or member_role.rolname = 'seo_activation_reader'
    )
    and not (
      member_role.rolname = current_user
      and exists (
        select 1 from pg_roles actor
        where actor.rolname = current_user
          and (actor.rolsuper or actor.rolcreaterole)
      )
    )
  ) then
    raise exception 'Stage E reader role must not be shared with any non-admin role';
  end if;
end;
$$;

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
    raise exception 'Stage E requires existing public tables with RLS enabled: %', missing_tables;
  end if;

  if not exists (
    select 1 from pg_roles actor
    where actor.rolname = current_user
      and (actor.rolsuper or actor.rolbypassrls)
  ) then
    raise exception 'Stage E aggregate view must be owned by a trusted database administrator';
  end if;
end;
$$;

create schema if not exists seo_private;
revoke all on schema seo_private from public, anon, authenticated;
revoke all on schema seo_private from seo_activation_reader;
grant usage on schema seo_private to seo_activation_reader;

-- Refuse a pre-existing direct source-table grant; the reader must use only
-- the fixed aggregate view below.
do $$
begin
  if has_table_privilege('seo_activation_reader','public.profiles','SELECT')
     or has_table_privilege('seo_activation_reader','public.onboarding_progress','SELECT')
     or has_table_privilege('seo_activation_reader','public.invoices','SELECT')
     or has_table_privilege('seo_activation_reader','public.expenses','SELECT') then
    raise exception 'Stage E reader has unexpected direct source-table access';
  end if;
end;
$$;

create or replace view seo_private.activation_aggregate
with (security_invoker = false, security_barrier = true)
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


revoke all on seo_private.activation_aggregate from public, anon, authenticated, seo_activation_reader;
grant select on seo_private.activation_aggregate to seo_activation_reader;

-- The login is deliberately left disabled. After review, an operator may set
-- a unique password and LOGIN for seo_activation_reader; do not grant it
-- source-table privileges or membership in any other role.
