-- READ-ONLY PRODUCTION AGGREGATE QUERY.
-- Returns counts only; never selects or emits user IDs, names, emails or financial values.
-- Run only with an authorized read-only database connection.
with registered as (
  select p.id,p.created_at
  from public.profiles p
  where p.created_at <= now()
),
onboarded as (
  select distinct o.user_id,o.completed_at
  from public.onboarding_progress o
  where o.completed_at is not null and o.completed_at <= now()
),
actions as (
  select i.user_id,i.created_at,(i.created_at at time zone 'UTC')::date as action_day
  from public.invoices i
  where i.created_at <= now()
    and lower(coalesce(i.status,'')) not in ('void','voided','cancelled','canceled','reversed','deleted')
  union all
  select e.user_id,e.created_at,(e.created_at at time zone 'UTC')::date as action_day
  from public.expenses e
  where e.created_at <= now()
),
activated as (
  select distinct a.user_id
  from actions a
  join onboarded o on o.user_id=a.user_id
  join registered r on r.id=a.user_id
  where o.completed_at >= r.created_at
    and a.created_at >= r.created_at
),
returning_all_time as (
  select a.user_id
  from actions a
  join onboarded o on o.user_id=a.user_id
  join registered r on r.id=a.user_id
  where o.completed_at >= r.created_at
    and a.created_at >= r.created_at
  group by a.user_id
  having count(distinct a.action_day)>=2
),
new_registered as (
  select r.id,r.created_at
  from registered r
  where r.created_at >= now() - interval '30 days'
),
new_onboarded as (
  select distinct nr.id
  from new_registered nr
  join onboarded o on o.user_id=nr.id and o.completed_at >= nr.created_at
),
new_activated as (
  select distinct nr.id
  from new_registered nr
  join onboarded o on o.user_id=nr.id and o.completed_at >= nr.created_at
  join actions a on a.user_id=nr.id and a.created_at >= nr.created_at
),
new_returning as (
  select a.user_id
  from actions a
  join new_registered nr on nr.id=a.user_id and a.created_at >= nr.created_at
  join onboarded o on o.user_id=nr.id and o.completed_at >= nr.created_at
  group by a.user_id
  having count(distinct a.action_day)>=2
)
select
  now() as source_watermark,
  (select count(*) from registered) as registered_users_all_time,
  (select count(*) from onboarded o join registered r on r.id=o.user_id and o.completed_at>=r.created_at) as onboarding_completions_all_time,
  (select count(*) from activated) as activated_users_all_time,
  (select count(*) from returning_all_time) as returning_activated_users_all_time,
  (select count(*) from new_registered) as new_registrations_30d,
  (select count(*) from new_onboarded) as new_onboarding_completions_30d,
  (select count(*) from new_activated) as new_activated_users_30d,
  (select count(*) from new_returning) as new_returning_activated_users_30d;
