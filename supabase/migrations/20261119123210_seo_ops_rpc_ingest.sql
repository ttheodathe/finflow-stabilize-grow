-- Server-only Data API entry points for the private seo_ops schema.
alter table seo_ops.performance_snapshots
  add column if not exists snapshot_key text;
create unique index if not exists performance_snapshots_snapshot_key_uidx
  on seo_ops.performance_snapshots(snapshot_key);

create or replace function public.seo_ops_record_run(
  p_scheduler_key text,
  p_scheduled_for date,
  p_attempt integer,
  p_status text,
  p_output jsonb default '{}'::jsonb,
  p_upstream_run_id uuid default null,
  p_error_summary text default null
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  insert into seo_ops.scheduler_runs(
    scheduler_key, scheduled_for, attempt, status, output, upstream_run_id, error_summary,
    completed_at
  ) values (
    p_scheduler_key, p_scheduled_for, p_attempt, p_status,
    coalesce(p_output, '{}'::jsonb), p_upstream_run_id, p_error_summary,
    case when p_status in ('SUCCEEDED','PARTIAL','FAILED','SKIPPED') then now() else null end
  )
  on conflict (scheduler_key, scheduled_for, attempt) do update
    set status = excluded.status,
        output = excluded.output,
        upstream_run_id = coalesce(excluded.upstream_run_id, seo_ops.scheduler_runs.upstream_run_id),
        error_summary = excluded.error_summary,
        completed_at = case
          when excluded.status in ('SUCCEEDED','PARTIAL','FAILED','SKIPPED')
            then coalesce(seo_ops.scheduler_runs.completed_at, now())
          else null
        end
    where seo_ops.scheduler_runs.status = 'RUNNING'
       or seo_ops.scheduler_runs.status = excluded.status
  returning id into v_id;

  if v_id is null then
    raise exception 'Invalid scheduler run state transition or conflicting terminal run';
  end if;
  return v_id;
end;
$$;

create or replace function public.seo_ops_record_opportunity(
  p_opportunity_key text,
  p_scheduler_run_id uuid,
  p_target_url text,
  p_query_text text,
  p_opportunity_type text,
  p_score numeric,
  p_evidence jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  insert into seo_ops.opportunities(
    opportunity_key, scheduler_run_id, target_url, query_text, opportunity_type, score, evidence
  ) values (
    p_opportunity_key, p_scheduler_run_id, p_target_url, p_query_text,
    p_opportunity_type, p_score, coalesce(p_evidence, '{}'::jsonb)
  )
  on conflict (opportunity_key) do update
    set scheduler_run_id = excluded.scheduler_run_id,
        target_url = excluded.target_url,
        query_text = excluded.query_text,
        opportunity_type = excluded.opportunity_type,
        score = excluded.score,
        evidence = excluded.evidence
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.seo_ops_record_performance_snapshot(
  p_snapshot_key text,
  p_scheduler_run_id uuid,
  p_period_start date,
  p_period_end date,
  p_source text,
  p_metrics jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  insert into seo_ops.performance_snapshots(
    snapshot_key, scheduler_run_id, period_start, period_end, source, metrics
  ) values (
    p_snapshot_key, p_scheduler_run_id, p_period_start, p_period_end, p_source,
    coalesce(p_metrics, '{}'::jsonb)
  )
  on conflict (snapshot_key) do update
    set scheduler_run_id = excluded.scheduler_run_id,
        period_start = excluded.period_start,
        period_end = excluded.period_end,
        source = excluded.source,
        metrics = excluded.metrics,
        collected_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.seo_ops_record_run(text,date,integer,text,jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.seo_ops_record_opportunity(text,uuid,text,text,text,numeric,jsonb) from public, anon, authenticated;
revoke all on function public.seo_ops_record_performance_snapshot(text,uuid,date,date,text,jsonb) from public, anon, authenticated;
grant execute on function public.seo_ops_record_run(text,date,integer,text,jsonb,uuid,text) to service_role;
grant execute on function public.seo_ops_record_opportunity(text,uuid,text,text,text,numeric,jsonb) to service_role;
grant execute on function public.seo_ops_record_performance_snapshot(text,uuid,date,date,text,jsonb) to service_role;
