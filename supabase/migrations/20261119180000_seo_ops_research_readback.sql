-- Read-only independent readback for the Scheduler 2 persistence state machine.
-- All functions are SECURITY INVOKER and callable only by service_role.
create or replace function public.seo_ops_get_content_operation(p_operation_id uuid)
returns table (
  id uuid,
  operation_key text,
  operation_type text,
  target_path text,
  slug text,
  status text,
  proposed_content_hash text,
  payload jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, seo_ops
as $$
  select op.id, op.operation_key, op.operation_type, op.target_path, op.slug, op.status,
         op.proposed_content_hash, op.payload
  from seo_ops.content_operations as op
  where op.id = p_operation_id;
$$;

create or replace function public.seo_ops_get_research_records(p_opportunity_id uuid)
returns table (
  id uuid,
  source_url text,
  source_title text,
  source_published_at date,
  retrieved_at timestamptz,
  supported_claims jsonb,
  unresolved_claims jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, seo_ops
as $$
  select rr.id, rr.source_url, rr.source_title, rr.source_published_at, rr.retrieved_at,
         rr.supported_claims, rr.unresolved_claims
  from seo_ops.research_records as rr
  where rr.opportunity_id = p_opportunity_id
  order by rr.source_url;
$$;

create or replace function public.seo_ops_get_content_revisions(p_operation_id uuid)
returns table (
  id uuid,
  revision_number integer,
  content_hash text,
  markdown text,
  revision_state text
)
language sql
stable
security invoker
set search_path = pg_catalog, seo_ops
as $$
  select cr.id, cr.revision_number, cr.content_hash, cr.markdown, cr.revision_state
  from seo_ops.content_revisions as cr
  where cr.operation_id = p_operation_id
  order by cr.revision_number desc;
$$;

revoke all on function public.seo_ops_get_content_operation(uuid) from public, anon, authenticated;
revoke all on function public.seo_ops_get_research_records(uuid) from public, anon, authenticated;
revoke all on function public.seo_ops_get_content_revisions(uuid) from public, anon, authenticated;
grant execute on function public.seo_ops_get_content_operation(uuid) to service_role;
grant execute on function public.seo_ops_get_research_records(uuid) to service_role;
grant execute on function public.seo_ops_get_content_revisions(uuid) to service_role;
