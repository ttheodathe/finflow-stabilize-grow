-- Acceptance-only fixture. Never apply this file to production.
create schema if not exists app_fixture;
create schema if not exists seo_ops_test;
revoke all on schema app_fixture, seo_ops_test from public, anon, authenticated;
grant usage on schema app_fixture, seo_ops_test to service_role;

create table if not exists app_fixture.users (
  id uuid primary key,
  created_at timestamptz not null,
  deleted_at timestamptz
);
create table if not exists app_fixture.onboarding_progress (
  user_id uuid primary key references app_fixture.users(id) on delete cascade,
  completed_at timestamptz
);
create table if not exists app_fixture.invoices (
  id uuid primary key,
  user_id uuid not null references app_fixture.users(id) on delete cascade,
  company_id uuid not null,
  created_at timestamptz not null,
  status text not null
);
create table if not exists app_fixture.expenses (
  id uuid primary key,
  user_id uuid not null references app_fixture.users(id) on delete cascade,
  company_id uuid not null,
  created_at timestamptz not null
);

alter table app_fixture.users enable row level security;
alter table app_fixture.onboarding_progress enable row level security;
alter table app_fixture.invoices enable row level security;
alter table app_fixture.expenses enable row level security;
grant select, insert, update, delete on all tables in schema app_fixture to service_role;

create or replace function seo_ops_test.compute_activation_counts(p_as_of timestamptz)
returns table(registered_users bigint,onboarding_completions bigint,activated_users bigint,returning_activated_users bigint)
language sql
security invoker
set search_path = pg_catalog, app_fixture
as $$
  with registered as (
    select u.id
    from app_fixture.users u
    where u.created_at <= p_as_of and u.deleted_at is null
  ),
  onboarded as (
    select distinct o.user_id, o.completed_at
    from app_fixture.onboarding_progress o
    join registered r on r.id=o.user_id
    where o.completed_at is not null and o.completed_at <= p_as_of
  ),
  actions as (
    select i.user_id, i.created_at as action_at, (i.created_at at time zone 'UTC')::date as action_day
    from app_fixture.invoices i
    join registered r on r.id=i.user_id
    where i.created_at <= p_as_of
      and lower(i.status) not in ('void','voided','cancelled','canceled','reversed','deleted')
    union all
    select e.user_id, e.created_at as action_at, (e.created_at at time zone 'UTC')::date as action_day
    from app_fixture.expenses e
    join registered r on r.id=e.user_id
    where e.created_at <= p_as_of
  ),
  activated as (
    select distinct a.user_id
    from actions a
    join onboarded o on o.user_id=a.user_id
    where a.action_at >= o.completed_at
  ),
  repeat_users as (
    select a.user_id
    from actions a
    join onboarded o on o.user_id=a.user_id
    where a.action_at >= o.completed_at
    group by a.user_id
    having count(distinct a.action_day) >= 2
  )
  select
    (select count(*) from registered),
    (select count(*) from onboarded),
    (select count(*) from activated),
    (select count(*) from repeat_users);
$$;

revoke all on function seo_ops_test.compute_activation_counts(timestamptz) from public, anon, authenticated;
grant execute on function seo_ops_test.compute_activation_counts(timestamptz) to service_role;

-- Fixture assertions: multiple companies count once per user; users sharing a
-- company remain distinct; incomplete onboarding, void invoices and actions
-- before onboarding do not activate; deleted users are excluded; returning
-- means qualifying actions after onboarding on 2+ UTC dates.
do $$
declare counts record;
begin
  insert into app_fixture.users(id,created_at,deleted_at) values
    ('10000000-0000-4000-8000-000000000001','2026-11-01T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000002','2026-10-01T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000003','2026-11-10T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000004','2026-10-10T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000005','2026-11-05T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000006','2026-11-06T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000007','2026-10-01T00:00:00Z','2026-11-15T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000008','2026-11-08T00:00:00Z',null),
    ('10000000-0000-4000-8000-000000000009','2026-11-08T00:00:00Z',null);
  insert into app_fixture.onboarding_progress(user_id,completed_at) values
    ('10000000-0000-4000-8000-000000000001','2026-11-02T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000002','2026-10-02T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000003',null),
    ('10000000-0000-4000-8000-000000000004','2026-10-11T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000005','2026-11-06T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000006','2026-11-07T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000007','2026-10-02T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000008','2026-11-11T00:00:00Z'),
    ('10000000-0000-4000-8000-000000000009','2026-11-11T00:00:00Z');
  insert into app_fixture.invoices(id,user_id,company_id,created_at,status) values
    ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','2026-11-03T00:00:00Z','draft'),
    ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','2026-11-04T00:00:00Z','sent'),
    ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','2026-10-03T00:00:00Z','paid'),
    ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','2026-11-11T00:00:00Z','sent'),
    ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','2026-10-12T00:00:00Z','void'),
    ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000001','2026-10-03T00:00:00Z','sent'),
    ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000001','2026-11-09T00:00:00Z','sent'),
    ('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000001','2026-11-10T00:00:00Z','sent');
  insert into app_fixture.expenses(id,user_id,company_id,created_at) values
    ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','2026-11-05T00:00:00Z'),
    ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','2026-10-03T12:00:00Z'),
    ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','2026-11-12T00:00:00Z'),
    ('40000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000001','2026-11-10T00:00:00Z'),
    ('40000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000001','2026-11-12T00:00:00Z');

  select * into counts from seo_ops_test.compute_activation_counts('2026-11-20T00:00:00Z');
  if counts.registered_users <> 8 then raise exception 'Expected 8 registered users, got %',counts.registered_users; end if;
  if counts.onboarding_completions <> 7 then raise exception 'Expected 7 onboarding completions, got %',counts.onboarding_completions; end if;
  if counts.activated_users <> 3 then raise exception 'Expected 3 activated users, got %',counts.activated_users; end if;
  if counts.returning_activated_users <> 1 then raise exception 'Expected 1 returning activated user, got %',counts.returning_activated_users; end if;
end $$;
