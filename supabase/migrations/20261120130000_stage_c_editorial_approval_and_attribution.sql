-- Stage C durable editorial approvals and article-level performance attribution.
-- Repository migration only. Do not apply to production during draft-only rollout.
create table if not exists seo_ops.editorial_reviewers (
  user_id uuid primary key,
  is_active boolean not null default true,
  reviewer_role text not null check (reviewer_role in ('EDITOR','ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists seo_ops.article_approvals (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references seo_ops.content_operations(id),
  revision_id uuid not null references seo_ops.content_revisions(id),
  reviewer_user_id uuid not null,
  decision text not null check (decision in ('APPROVED','CHANGES_REQUESTED','REJECTED')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  review_notes text,
  authenticated_subject text not null,
  approved_at timestamptz not null default now(),
  unique (revision_id, reviewer_user_id, decision)
);
create table if not exists seo_ops.article_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null unique,
  operation_id uuid references seo_ops.content_operations(id),
  revision_id uuid references seo_ops.content_revisions(id),
  slug text not null,
  canonical_url text not null,
  source text not null check (source in ('GSC','GA4')),
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  measurement_scope text not null check (measurement_scope in ('PAGE_LEVEL_DIRECT','AGGREGATE_CORRELATION')),
  revision_attribution text not null default 'UNKNOWN' check (revision_attribution in ('VERIFIED_DEPLOYED_REVISION','UNKNOWN')),
  collected_at timestamptz not null default now(),
  check (period_end >= period_start)
);

alter table seo_ops.editorial_reviewers enable row level security;
alter table seo_ops.article_approvals enable row level security;
alter table seo_ops.article_performance_snapshots enable row level security;
create policy service_role_full_access on seo_ops.editorial_reviewers for all to service_role using (true) with check (true);
create policy service_role_full_access on seo_ops.article_approvals for all to service_role using (true) with check (true);
create policy service_role_full_access on seo_ops.article_performance_snapshots for all to service_role using (true) with check (true);
revoke all on table seo_ops.editorial_reviewers, seo_ops.article_approvals, seo_ops.article_performance_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table seo_ops.editorial_reviewers, seo_ops.article_approvals, seo_ops.article_performance_snapshots to service_role;

create or replace function public.seo_ops_record_article_approval(
  p_operation_id uuid, p_revision_id uuid, p_content_hash text,
  p_reviewer_user_id uuid, p_authenticated_subject text,
  p_decision text, p_review_notes text default null
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid; v_revision seo_ops.content_revisions%rowtype; v_operation seo_ops.content_operations%rowtype;
begin
  if p_authenticated_subject is null or p_authenticated_subject = ''
     or p_authenticated_subject <> p_reviewer_user_id::text then
    raise exception 'Authenticated reviewer identity mismatch';
  end if;
  if p_decision not in ('APPROVED','CHANGES_REQUESTED','REJECTED') then raise exception 'Invalid editorial decision'; end if;
  if not exists (select 1 from seo_ops.editorial_reviewers r where r.user_id = p_reviewer_user_id and r.is_active = true) then
    raise exception 'Reviewer is not active or authorized';
  end if;
  select * into v_revision from seo_ops.content_revisions
    where id = p_revision_id and operation_id = p_operation_id for update;
  if not found or v_revision.content_hash <> p_content_hash then raise exception 'Approval does not match the exact stored revision'; end if;
  select * into v_operation from seo_ops.content_operations where id = p_operation_id for update;
  if not found or v_operation.proposed_content_hash <> p_content_hash then raise exception 'Approval hash does not match the current content operation'; end if;
  if v_operation.status not in ('PROPOSED','RESEARCHED','DRAFTED','AWAITING_APPROVAL') then raise exception 'Content operation is not eligible for editorial review'; end if;
  insert into seo_ops.article_approvals(operation_id,revision_id,reviewer_user_id,decision,content_hash,review_notes,authenticated_subject)
  values (p_operation_id,p_revision_id,p_reviewer_user_id,p_decision,p_content_hash,nullif(p_review_notes,''),p_authenticated_subject)
  returning id into v_id;
  if p_decision = 'APPROVED' then
    update seo_ops.content_revisions set revision_state = 'APPROVED' where id = p_revision_id and revision_state = 'PROPOSED';
    update seo_ops.content_operations set status = 'APPROVED', approved_content_hash = p_content_hash,
      payload = payload || jsonb_build_object('workflowState','EDITORIALLY_APPROVED_DRAFT_ONLY','editorialApprovalId',v_id,'approvedRevisionId',p_revision_id),
      updated_at = now() where id = p_operation_id;
  elsif p_decision = 'CHANGES_REQUESTED' then
    update seo_ops.content_operations set status = 'AWAITING_APPROVAL',
      payload = payload || jsonb_build_object('workflowState','CHANGES_REQUESTED','latestEditorialDecision',p_decision),
      updated_at = now() where id = p_operation_id;
  else
    update seo_ops.content_operations set status = 'REJECTED',
      payload = payload || jsonb_build_object('workflowState','EDITORIALLY_REJECTED','latestEditorialDecision',p_decision),
      updated_at = now() where id = p_operation_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.seo_ops_record_article_performance(
  p_snapshot_key text, p_operation_id uuid, p_revision_id uuid,
  p_slug text, p_canonical_url text, p_source text,
  p_period_start date, p_period_end date, p_metrics jsonb,
  p_measurement_scope text, p_revision_attribution text default 'UNKNOWN'
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  if p_revision_id is not null and not exists (
    select 1 from seo_ops.content_revisions r where r.id = p_revision_id and r.operation_id = p_operation_id
  ) then raise exception 'Performance snapshot revision does not belong to the operation'; end if;
  insert into seo_ops.article_performance_snapshots(
    snapshot_key,operation_id,revision_id,slug,canonical_url,source,period_start,period_end,metrics,measurement_scope,revision_attribution
  ) values (
    p_snapshot_key,p_operation_id,p_revision_id,p_slug,p_canonical_url,p_source,p_period_start,p_period_end,
    coalesce(p_metrics,'{}'::jsonb),p_measurement_scope,p_revision_attribution
  )
  on conflict (snapshot_key) do update set metrics = excluded.metrics, period_start = excluded.period_start,
    period_end = excluded.period_end, collected_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.seo_ops_record_article_performance(text,uuid,uuid,text,text,text,date,date,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text) to service_role;
grant execute on function public.seo_ops_record_article_performance(text,uuid,uuid,text,text,text,date,date,jsonb,text,text) to service_role;


-- Atomic revision advancement: supersede the previous proposal and bind the new hash.
create or replace function public.seo_ops_advance_content_revision(
  p_operation_id uuid,
  p_revision_number integer,
  p_content_hash text,
  p_markdown text,
  p_previous_content_hash text,
  p_operation_payload jsonb
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, seo_ops
as $$
declare
  v_operation seo_ops.content_operations%rowtype;
  v_existing seo_ops.content_revisions%rowtype;
  v_latest_number integer;
  v_id uuid;
begin
  if p_content_hash is null or p_content_hash !~ '^[a-f0-9]{64}$'
     or p_markdown is null or p_revision_number is null or p_revision_number < 1 then
    raise exception 'Invalid revision advancement input';
  end if;
  select * into v_operation from seo_ops.content_operations where id = p_operation_id for update;
  if not found or v_operation.status not in ('PROPOSED','AWAITING_APPROVAL') then
    raise exception 'Only a proposed content operation can receive a new revision';
  end if;

  select * into v_existing from seo_ops.content_revisions
  where operation_id = p_operation_id and content_hash = p_content_hash;
  if found then
    if v_existing.revision_number <> p_revision_number or v_existing.markdown <> p_markdown then
      raise exception 'Revision retry does not match immutable stored revision';
    end if;
    update seo_ops.content_operations
      set proposed_content_hash = p_content_hash,
          payload = coalesce(p_operation_payload, payload),
          updated_at = now()
      where id = p_operation_id;
    return v_existing.id;
  end if;

  select coalesce(max(revision_number),0) into v_latest_number
  from seo_ops.content_revisions where operation_id = p_operation_id;
  if p_revision_number <> v_latest_number + 1 then
    raise exception 'Revision number must be the next sequential revision';
  end if;
  if v_latest_number = 0 then
    if v_operation.proposed_content_hash is distinct from p_content_hash
       and p_previous_content_hash is not null then
      raise exception 'Initial revision has an unexpected previous hash';
    end if;
  else
    if p_previous_content_hash is null or v_operation.proposed_content_hash <> p_previous_content_hash then
      raise exception 'Previous revision hash does not match current operation state';
    end if;
    update seo_ops.content_revisions
      set revision_state = 'SUPERSEDED'
      where operation_id = p_operation_id and revision_state = 'PROPOSED';
  end if;

  insert into seo_ops.content_revisions(operation_id,revision_number,content_hash,markdown,revision_state)
  values (p_operation_id,p_revision_number,p_content_hash,p_markdown,'PROPOSED')
  returning id into v_id;
  update seo_ops.content_operations
    set proposed_content_hash = p_content_hash,
        status = 'PROPOSED',
        payload = coalesce(p_operation_payload, payload),
        updated_at = now()
    where id = p_operation_id;
  return v_id;
end;
$$;
revoke all on function public.seo_ops_advance_content_revision(uuid,integer,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.seo_ops_advance_content_revision(uuid,integer,text,text,text,jsonb) to service_role;

create or replace function public.seo_ops_get_article_approval(p_approval_id uuid)
returns table (
  id uuid, operation_id uuid, revision_id uuid, reviewer_user_id uuid,
  decision text, content_hash text, approved_at timestamptz
)
language sql stable security invoker
set search_path = pg_catalog, seo_ops
as $$
  select a.id,a.operation_id,a.revision_id,a.reviewer_user_id,a.decision,a.content_hash,a.approved_at
  from seo_ops.article_approvals a where a.id = p_approval_id;
$$;
revoke all on function public.seo_ops_get_article_approval(uuid) from public, anon, authenticated;
grant execute on function public.seo_ops_get_article_approval(uuid) to service_role;
