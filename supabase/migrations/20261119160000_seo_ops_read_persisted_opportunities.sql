-- Read-only server-side retrieval of Scheduler 1 opportunities for Scheduler 2.
-- SECURITY INVOKER ensures the caller's table privileges and RLS remain in force.
create or replace function public.seo_ops_get_opportunities(p_scheduler_run_id uuid)
returns table (
  opportunity_key text,
  target_url text,
  query_text text,
  opportunity_type text,
  score numeric,
  evidence jsonb,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, seo_ops
as $$
  select
    o.opportunity_key,
    o.target_url,
    o.query_text,
    o.opportunity_type,
    o.score,
    o.evidence,
    o.created_at
  from seo_ops.opportunities as o
  where o.scheduler_run_id = p_scheduler_run_id
  order by o.score desc, o.created_at desc;
$$;

revoke all on function public.seo_ops_get_opportunities(uuid) from public, anon, authenticated;
grant execute on function public.seo_ops_get_opportunities(uuid) to service_role;
