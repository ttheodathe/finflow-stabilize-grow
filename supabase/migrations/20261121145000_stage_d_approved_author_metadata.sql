-- Stage D: bind an explicitly approved byline to the exact approved article revision.
-- Repository migration only. Acceptance deployment must be verified before any production rollout.

alter table seo_ops.article_approvals
  add column if not exists approved_author text;

create table if not exists seo_ops.editorial_authors (
  author_name text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(author_name)) between 1 and 120)
);

alter table seo_ops.editorial_authors enable row level security;
drop policy if exists service_role_full_access on seo_ops.editorial_authors;
create policy service_role_full_access
  on seo_ops.editorial_authors for all to service_role
  using (true) with check (true);

revoke all on table seo_ops.editorial_authors from public, anon, authenticated;
grant select, insert, update, delete on table seo_ops.editorial_authors to service_role;

insert into seo_ops.editorial_authors(author_name, is_active)
values ('FinFlowTrack Editorial Team', true)
on conflict (author_name) do update
set is_active = excluded.is_active, updated_at = now();

-- Remove the old signature so no caller can approve without supplying a byline.
drop function if exists public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text);

create function public.seo_ops_record_article_approval(
  p_operation_id uuid,
  p_revision_id uuid,
  p_content_hash text,
  p_reviewer_user_id uuid,
  p_authenticated_subject text,
  p_decision text,
  p_review_notes text default null,
  p_approved_author text default null
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, seo_ops
as $$
declare
  v_id uuid;
  v_revision seo_ops.content_revisions%rowtype;
  v_operation seo_ops.content_operations%rowtype;
  v_approved_author text := nullif(btrim(p_approved_author), '');
begin
  if p_authenticated_subject is null or p_authenticated_subject = ''
     or p_authenticated_subject <> p_reviewer_user_id::text then
    raise exception 'Authenticated reviewer identity mismatch';
  end if;

  if p_decision not in ('APPROVED','CHANGES_REQUESTED','REJECTED') then
    raise exception 'Invalid editorial decision';
  end if;

  if not exists (
    select 1 from seo_ops.editorial_reviewers r
    where r.user_id = p_reviewer_user_id and r.is_active = true
  ) then
    raise exception 'Reviewer is not active or authorized';
  end if;

  if p_decision = 'APPROVED' then
    if v_approved_author is null or not exists (
      select 1 from seo_ops.editorial_authors a
      where a.author_name = v_approved_author and a.is_active = true
    ) then
      raise exception 'An active, explicitly approved author is required';
    end if;
  elsif v_approved_author is not null then
    raise exception 'A byline may only be assigned with an approval decision';
  end if;

  select * into v_revision from seo_ops.content_revisions
    where id = p_revision_id and operation_id = p_operation_id for update;
  if not found or v_revision.content_hash <> p_content_hash then
    raise exception 'Approval does not match the exact stored revision';
  end if;

  select * into v_operation from seo_ops.content_operations
    where id = p_operation_id for update;
  if not found or v_operation.proposed_content_hash <> p_content_hash then
    raise exception 'Approval hash does not match the current content operation';
  end if;
  if v_operation.status not in ('PROPOSED','RESEARCHED','DRAFTED','AWAITING_APPROVAL') then
    raise exception 'Content operation is not eligible for editorial review';
  end if;

  insert into seo_ops.article_approvals(
    operation_id, revision_id, reviewer_user_id, decision, content_hash,
    review_notes, authenticated_subject, approved_author
  ) values (
    p_operation_id, p_revision_id, p_reviewer_user_id, p_decision, p_content_hash,
    nullif(p_review_notes,''), p_authenticated_subject, v_approved_author
  ) returning id into v_id;

  if p_decision = 'APPROVED' then
    update seo_ops.content_revisions
      set revision_state = 'APPROVED'
      where id = p_revision_id and revision_state = 'PROPOSED';
    update seo_ops.content_operations
      set status = 'APPROVED',
          approved_content_hash = p_content_hash,
          payload = payload || jsonb_build_object(
            'workflowState','EDITORIALLY_APPROVED_DRAFT_ONLY',
            'editorialApprovalId',v_id,
            'approvedRevisionId',p_revision_id,
            'approvedAuthor',v_approved_author
          ),
          updated_at = now()
      where id = p_operation_id;
  elsif p_decision = 'CHANGES_REQUESTED' then
    update seo_ops.content_operations
      set status = 'AWAITING_APPROVAL',
          payload = payload || jsonb_build_object(
            'workflowState','CHANGES_REQUESTED',
            'latestEditorialDecision',p_decision
          ),
          updated_at = now()
      where id = p_operation_id;
  else
    update seo_ops.content_operations
      set status = 'REJECTED',
          payload = payload || jsonb_build_object(
            'workflowState','EDITORIALLY_REJECTED',
            'latestEditorialDecision',p_decision
          ),
          updated_at = now()
      where id = p_operation_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text,text)
  to service_role;

drop function if exists public.seo_ops_get_article_approval(uuid);
create function public.seo_ops_get_article_approval(p_approval_id uuid)
returns table (
  id uuid,
  operation_id uuid,
  revision_id uuid,
  reviewer_user_id uuid,
  decision text,
  content_hash text,
  approved_author text,
  decided_at timestamptz
)
language sql stable security invoker
set search_path = pg_catalog, seo_ops
as $$
  select a.id, a.operation_id, a.revision_id, a.reviewer_user_id,
         a.decision, a.content_hash, a.approved_author, a.decided_at
  from seo_ops.article_approvals a
  where a.id = p_approval_id;
$$;

revoke all on function public.seo_ops_get_article_approval(uuid) from public, anon, authenticated;
grant execute on function public.seo_ops_get_article_approval(uuid) to service_role;
