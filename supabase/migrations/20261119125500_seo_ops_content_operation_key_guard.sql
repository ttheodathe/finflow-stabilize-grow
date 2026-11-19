create or replace function public.seo_ops_record_content_operation(
  p_operation_key text,
  p_operation_type text,
  p_target_path text,
  p_slug text,
  p_status text,
  p_payload jsonb,
  p_proposed_content_hash text default null,
  p_expected_blob_sha text default null
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare
  v_id uuid;
  v_existing seo_ops.content_operations%rowtype;
begin
  if p_status <> 'PROPOSED' then
    raise exception 'This RPC only accepts PROPOSED content operations';
  end if;
  if p_target_path !~ '^content/blog/[a-z0-9-]+[.]md$'
     or p_slug !~ '^[a-z0-9-]+$'
     or p_operation_key = '' then
    raise exception 'Invalid content operation key, slug or target path';
  end if;

  insert into seo_ops.content_operations(
    operation_key,operation_type,target_path,slug,status,
    proposed_content_hash,expected_blob_sha,payload
  ) values (
    p_operation_key,p_operation_type,p_target_path,p_slug,p_status,
    p_proposed_content_hash,p_expected_blob_sha,coalesce(p_payload,'{}'::jsonb)
  )
  on conflict (operation_key) do update
    set payload = excluded.payload,
        updated_at = now()
    where seo_ops.content_operations.status = 'PROPOSED'
      and seo_ops.content_operations.operation_type = excluded.operation_type
      and seo_ops.content_operations.target_path = excluded.target_path
      and seo_ops.content_operations.slug = excluded.slug
  returning id into v_id;

  if v_id is not null then return v_id; end if;

  select * into v_existing
  from seo_ops.content_operations
  where operation_key = p_operation_key;

  if not found then raise exception 'Content operation could not be persisted'; end if;
  if v_existing.operation_type <> p_operation_type
     or v_existing.target_path <> p_target_path
     or v_existing.slug <> p_slug then
    raise exception 'Operation key is already bound to a different content target';
  end if;
  return v_existing.id;
end;
$$;

revoke all on function public.seo_ops_record_content_operation(text,text,text,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.seo_ops_record_content_operation(text,text,text,text,text,jsonb,text,text) to service_role;
