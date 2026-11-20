-- Preserve content revision identity and state across idempotent retries.
-- New revisions are proposals; approval/commit transitions require separate workflow operations.
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
declare
  v_id uuid;
  v_existing_count integer;
  v_existing record;
  v_state text := coalesce(p_revision_state, 'PROPOSED');
begin
  if p_operation_id is null
     or p_revision_number is null
     or p_revision_number <= 0
     or p_content_hash is null
     or btrim(p_content_hash) = ''
     or p_markdown is null then
    raise exception 'Invalid content revision input';
  end if;

  if v_state <> 'PROPOSED' then
    raise exception 'Content revision creation only accepts PROPOSED state';
  end if;

  insert into seo_ops.content_revisions (
    operation_id,
    revision_number,
    content_hash,
    markdown,
    revision_state
  )
  values (
    p_operation_id,
    p_revision_number,
    p_content_hash,
    p_markdown,
    'PROPOSED'
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is not null then
    return v_id;
  end if;

  -- Both unique constraints matter. A retry is valid only when both
  -- identifiers resolve to the same existing revision.
  select count(*)
    into v_existing_count
  from seo_ops.content_revisions
  where operation_id = p_operation_id
    and (
      revision_number = p_revision_number
      or content_hash = p_content_hash
    );

  if v_existing_count <> 1 then
    raise exception
      'Content revision conflicts with an existing revision number or content hash';
  end if;

  select id, revision_number, content_hash, markdown, revision_state
    into v_existing
  from seo_ops.content_revisions
  where operation_id = p_operation_id
    and (
      revision_number = p_revision_number
      or content_hash = p_content_hash
    )
  for update;

  if not found
     or v_existing.revision_number <> p_revision_number
     or v_existing.content_hash <> p_content_hash
     or v_existing.markdown <> p_markdown then
    raise exception
      'Content revision retry does not match the immutable stored revision';
  end if;

  -- Intentionally do not update revision_state: retries must never
  -- downgrade an APPROVED or COMMITTED revision back to PROPOSED.
  return v_existing.id;
end;
$$;

revoke all on function public.seo_ops_record_content_revision(uuid,integer,text,text,text)
  from public, anon, authenticated;

grant execute on function public.seo_ops_record_content_revision(uuid,integer,text,text,text)
  to service_role;
