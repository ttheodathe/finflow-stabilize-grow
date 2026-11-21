-- Stage D: claim approved article revisions for idempotent, audited publication.
-- The publisher itself is separately gated by GitHub OIDC and an explicit repository variable.

create table if not exists seo_ops.article_publications (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique,
  operation_id uuid not null references seo_ops.content_operations(id),
  revision_id uuid not null references seo_ops.content_revisions(id),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  slug text not null,
  target_path text not null,
  operation_type text not null check (operation_type in ('NEW_ARTICLE','EXISTING_ARTICLE_UPDATE')),
  approved_author text not null,
  target_base_content_hash text check (
    target_base_content_hash is null or target_base_content_hash ~ '^[a-f0-9]{64}$'
  ),
  status text not null check (status in (
    'CLAIMED','PULL_REQUEST_OPEN','MERGED','DEPLOYMENT_READY','URL_VERIFIED','FAILED','STALE'
  )),
  lease_expires_at timestamptz,
  github_branch text,
  github_pr_number bigint,
  commit_sha text,
  published_content_hash text check (
    published_content_hash is null or published_content_hash ~ '^[a-f0-9]{64}$'
  ),
  deployment_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, revision_id),
  check (target_path = 'content/blog/' || slug || '.md')
);

create index if not exists article_publications_status_lease_idx
  on seo_ops.article_publications(status, lease_expires_at);

alter table seo_ops.article_publications enable row level security;
drop policy if exists service_role_full_access on seo_ops.article_publications;
create policy service_role_full_access
  on seo_ops.article_publications for all to service_role
  using (true) with check (true);

revoke all on table seo_ops.article_publications from public, anon, authenticated;
grant select, insert, update, delete on table seo_ops.article_publications to service_role;

create or replace function public.seo_ops_claim_next_article_for_publication(p_claim_id uuid)
returns jsonb
language plpgsql security invoker
set search_path = pg_catalog, seo_ops
as $$
declare
  v_item record;
  v_target_base_hash text;
  v_publication_id uuid;
begin
  if p_claim_id is null then
    raise exception 'A publication claim id is required';
  end if;

  select
    o.id as operation_id,
    o.operation_type,
    o.slug,
    o.target_path,
    o.payload,
    r.id as revision_id,
    r.markdown,
    r.content_hash,
    a.approved_author
  into v_item
  from seo_ops.content_operations o
  join seo_ops.content_revisions r
    on r.operation_id = o.id
   and r.content_hash = o.approved_content_hash
   and r.revision_state = 'APPROVED'
  join lateral (
    select approval.approved_author
    from seo_ops.article_approvals approval
    where approval.operation_id = o.id
      and approval.revision_id = r.id
      and approval.decision = 'APPROVED'
      and approval.content_hash = r.content_hash
      and approval.approved_author is not null
    order by approval.decided_at desc
    limit 1
  ) a on true
  where o.status = 'APPROVED'
    and o.approved_content_hash = o.proposed_content_hash
    and o.target_path = 'content/blog/' || o.slug || '.md'
    and not exists (
      select 1 from seo_ops.article_publications existing
      where existing.operation_id = o.id
        and existing.revision_id = r.id
        and existing.status not in ('FAILED','STALE')
        and not (existing.status = 'CLAIMED' and existing.lease_expires_at < now())
    )
  order by o.created_at asc
  for update of o skip locked
  limit 1;

  if not found then
    return null;
  end if;

  v_target_base_hash := nullif(v_item.payload->>'targetBaseContentHash','');
  if v_item.operation_type = 'EXISTING_ARTICLE_UPDATE'
     and (v_target_base_hash is null or v_target_base_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'Existing article update is missing its public base content hash';
  end if;
  if v_item.operation_type = 'NEW_ARTICLE' and v_target_base_hash is not null then
    raise exception 'New article unexpectedly contains an existing public base hash';
  end if;

  insert into seo_ops.article_publications(
    claim_id, operation_id, revision_id, content_hash, slug, target_path,
    operation_type, approved_author, target_base_content_hash, status,
    lease_expires_at
  ) values (
    p_claim_id, v_item.operation_id, v_item.revision_id, v_item.content_hash,
    v_item.slug, v_item.target_path, v_item.operation_type, v_item.approved_author,
    v_target_base_hash, 'CLAIMED', now() + interval '20 minutes'
  )
  on conflict (operation_id, revision_id) do update
    set claim_id = excluded.claim_id,
        content_hash = excluded.content_hash,
        approved_author = excluded.approved_author,
        target_base_content_hash = excluded.target_base_content_hash,
        status = 'CLAIMED',
        lease_expires_at = excluded.lease_expires_at,
        github_branch = null,
        github_pr_number = null,
        commit_sha = null,
        published_content_hash = null,
        deployment_url = null,
        error_message = null,
        updated_at = now()
    where seo_ops.article_publications.status in ('FAILED','STALE')
       or (seo_ops.article_publications.status = 'CLAIMED'
           and seo_ops.article_publications.lease_expires_at < now())
  returning id into v_publication_id;

  if v_publication_id is null then
    return null;
  end if;

  update seo_ops.content_operations
  set payload = payload || jsonb_build_object(
        'publicationClaimId', p_claim_id,
        'publicationState', 'CLAIMED',
        'publicationClaimedAt', now()
      ),
      updated_at = now()
  where id = v_item.operation_id;

  return jsonb_build_object(
    'publicationId', v_publication_id,
    'claimId', p_claim_id,
    'operationId', v_item.operation_id,
    'revisionId', v_item.revision_id,
    'operationType', v_item.operation_type,
    'slug', v_item.slug,
    'targetPath', v_item.target_path,
    'contentHash', v_item.content_hash,
    'markdown', v_item.markdown,
    'approvedAuthor', v_item.approved_author,
    'targetBaseContentHash', v_target_base_hash
  );
end;
$$;

create or replace function public.seo_ops_update_article_publication(
  p_claim_id uuid,
  p_status text,
  p_github_branch text default null,
  p_github_pr_number bigint default null,
  p_commit_sha text default null,
  p_published_content_hash text default null,
  p_deployment_url text default null,
  p_error_message text default null
) returns boolean
language plpgsql security invoker
set search_path = pg_catalog, seo_ops
as $$
declare
  v_publication seo_ops.article_publications%rowtype;
  v_operation_status text;
begin
  if p_claim_id is null or p_status not in (
    'PULL_REQUEST_OPEN','MERGED','DEPLOYMENT_READY','URL_VERIFIED','FAILED','STALE'
  ) then
    raise exception 'Invalid publication update';
  end if;

  select * into v_publication
  from seo_ops.article_publications
  where claim_id = p_claim_id
  for update;

  if not found then
    raise exception 'Publication claim was not found';
  end if;

  if (p_status = 'PULL_REQUEST_OPEN' and v_publication.status <> 'CLAIMED')
     or (p_status = 'MERGED' and v_publication.status <> 'PULL_REQUEST_OPEN')
     or (p_status = 'DEPLOYMENT_READY' and v_publication.status <> 'MERGED')
     or (p_status = 'URL_VERIFIED' and v_publication.status <> 'DEPLOYMENT_READY')
     or (p_status = 'FAILED' and v_publication.status not in ('CLAIMED','PULL_REQUEST_OPEN','MERGED','DEPLOYMENT_READY'))
     or (p_status = 'STALE' and v_publication.status not in ('CLAIMED','PULL_REQUEST_OPEN')) then
    raise exception 'Invalid publication state transition: % to %', v_publication.status, p_status;
  end if;

  if p_status = 'PULL_REQUEST_OPEN'
     and (p_github_branch is null or p_github_branch !~ '^seo-publish/[a-z0-9-]+$'
          or p_github_pr_number is null or p_github_pr_number < 1) then
    raise exception 'Pull request branch and number are required';
  end if;
  if p_status = 'MERGED' and (p_commit_sha is null or p_commit_sha !~ '^[a-f0-9]{40}$') then
    raise exception 'A verified merge commit SHA is required';
  end if;
  if p_status in ('DEPLOYMENT_READY','URL_VERIFIED')
     and (p_deployment_url is null or p_deployment_url !~ '^https://www\.finflowtrack\.com/') then
    raise exception 'A verified production deployment URL is required';
  end if;
  if p_status = 'URL_VERIFIED'
     and (p_published_content_hash is null or p_published_content_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'Published content hash is required for URL verification';
  end if;
  if p_status in ('FAILED','STALE') and nullif(btrim(p_error_message),'') is null then
    raise exception 'Failure or stale-state reason is required';
  end if;

  update seo_ops.article_publications
  set status = p_status,
      github_branch = coalesce(p_github_branch, github_branch),
      github_pr_number = coalesce(p_github_pr_number, github_pr_number),
      commit_sha = coalesce(p_commit_sha, commit_sha),
      published_content_hash = coalesce(p_published_content_hash, published_content_hash),
      deployment_url = coalesce(p_deployment_url, deployment_url),
      error_message = case when p_status in ('FAILED','STALE') then left(p_error_message, 2000) else null end,
      lease_expires_at = case when p_status = 'CLAIMED' then lease_expires_at else null end,
      updated_at = now()
  where claim_id = p_claim_id;

  v_operation_status := case p_status
    when 'MERGED' then 'COMMITTED'
    when 'DEPLOYMENT_READY' then 'DEPLOYMENT_READY'
    when 'URL_VERIFIED' then 'URL_VERIFIED'
    when 'FAILED' then case when v_publication.status in ('CLAIMED','PULL_REQUEST_OPEN') then 'APPROVED' else 'FAILED' end
    when 'STALE' then 'FAILED'
    else null
  end;

  if v_operation_status is not null then
    update seo_ops.content_operations
    set status = v_operation_status,
        commit_sha = coalesce(p_commit_sha, commit_sha),
        payload = payload || jsonb_strip_nulls(jsonb_build_object(
          'publicationState', p_status,
          'githubBranch', p_github_branch,
          'githubPrNumber', p_github_pr_number,
          'commitSha', p_commit_sha,
          'deploymentUrl', p_deployment_url,
          'publishedContentHash', p_published_content_hash,
          'publicationError', case when p_status in ('FAILED','STALE') then left(p_error_message,2000) else null end
        )),
        updated_at = now()
    where id = v_publication.operation_id;
  end if;

  return true;
end;
$$;

revoke all on function public.seo_ops_claim_next_article_for_publication(uuid) from public, anon, authenticated;
grant execute on function public.seo_ops_claim_next_article_for_publication(uuid) to service_role;

revoke all on function public.seo_ops_update_article_publication(uuid,text,text,bigint,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.seo_ops_update_article_publication(uuid,text,text,bigint,text,text,text,text)
  to service_role;
