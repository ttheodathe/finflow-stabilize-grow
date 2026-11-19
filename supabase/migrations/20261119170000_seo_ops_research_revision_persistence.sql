-- Durable source-level research and immutable draft revision persistence.
-- All entry points are SECURITY INVOKER and callable only by service_role.
-- The opportunity reader's OUT columns are extended with source-run metadata.
drop function if exists public.seo_ops_get_opportunities(uuid);
create function public.seo_ops_get_opportunities(p_scheduler_run_id uuid)
returns table (
  id uuid,
  opportunity_key text,
  target_url text,
  query_text text,
  opportunity_type text,
  score numeric,
  evidence jsonb,
  created_at timestamptz,
  source_run_output jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, seo_ops
as $
  select o.id, o.opportunity_key, o.target_url, o.query_text,
         o.opportunity_type, o.score, o.evidence, o.created_at, r.output
  from seo_ops.opportunities o
  join seo_ops.scheduler_runs r on r.id = o.scheduler_run_id
  where o.scheduler_run_id = p_scheduler_run_id
  order by o.score desc, o.created_at desc;
$;
revoke all on function public.seo_ops_get_opportunities(uuid) from public, anon, authenticated;
grant execute on function public.seo_ops_get_opportunities(uuid) to service_role;

create or replace function public.seo_ops_record_research_record(
  p_opportunity_id uuid,
  p_source_url text,
  p_source_title text,
  p_source_published_at date,
  p_retrieved_at timestamptz,
  p_supported_claims jsonb,
  p_unresolved_claims jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  insert into seo_ops.research_records(
    opportunity_id, source_url, source_title, source_published_at,
    retrieved_at, supported_claims, unresolved_claims
  ) values (
    p_opportunity_id, p_source_url, p_source_title, p_source_published_at,
    coalesce(p_retrieved_at, now()), coalesce(p_supported_claims, '[]'::jsonb),
    coalesce(p_unresolved_claims, '[]'::jsonb)
  )
  on conflict (opportunity_id, source_url) do update
    set source_title = excluded.source_title,
        source_published_at = excluded.source_published_at,
        retrieved_at = excluded.retrieved_at,
        supported_claims = excluded.supported_claims,
        unresolved_claims = excluded.unresolved_claims
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.seo_ops_record_content_revision(
  p_operation_id uuid,
  p_revision_number integer,
  p_content_hash text,
  p_markdown text,
  p_revision_state text
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  insert into seo_ops.content_revisions(
    operation_id, revision_number, content_hash, markdown, revision_state
  ) values (
    p_operation_id, p_revision_number, p_content_hash, p_markdown,
    coalesce(p_revision_state, 'PROPOSED')
  )
  on conflict (operation_id, content_hash) do update
    set markdown = excluded.markdown,
        revision_state = excluded.revision_state
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.seo_ops_record_research_record(uuid,text,text,date,timestamptz,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.seo_ops_record_content_revision(uuid,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.seo_ops_record_research_record(uuid,text,text,date,timestamptz,jsonb,jsonb) to service_role;
grant execute on function public.seo_ops_record_content_revision(uuid,integer,text,text,text) to service_role;
