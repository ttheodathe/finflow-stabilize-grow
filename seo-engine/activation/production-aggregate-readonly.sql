-- READ-ONLY PRODUCTION AGGREGATE QUERY.
-- Returns counts only; never selects or emits user IDs, names, emails or financial values.
-- Run only with an authorized read-only database connection.
with registered as (
  select p.id,p.created_at
  from public.profiles p
  where p.created_at <= now()
),
onboarded as (
  select o.user_id,min(o.completed_at) as completed_at
  from public.onboarding_progress o
  where o.completed_at is not null and o.completed_at <= now()
  group by o.user_id
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
    and a.created_at >= o.completed_at
),
returning_all_time as (
  select a.user_id
  from actions a
  join onboarded o on o.user_id=a.user_id
  join registered r on r.id=a.user_id
  where o.completed_at >= r.created_at
    and a.created_at >= r.created_at
    and a.created_at >= o.completed_at
  group by a.user_id
  having count(distinct a.action_day)>=2
),
new_register¶»§q«^