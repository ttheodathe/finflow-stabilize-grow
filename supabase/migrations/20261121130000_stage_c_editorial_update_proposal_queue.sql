-- Expose the stored constructive update recommendation in the authenticated review queue.
-- The Edge Function still verifies the reviewer identity and calls this RPC with service role.
drop function if exists public.seo_ops_list_pending_editorial_reviews(uuid, text);

create function public.seo_ops_list_pending_editorial_reviews(
  p_reviewer_user_id uuid,
  p_authenticated_subject text
)
returns table (
  operation_id uuid,
  revision_id uuid,
  slug text,
  target_path text,
  operation_status text,
  revision_number integer,
  content_hash text,
  markdown text,
  created_at timestamptz,
  updated_at timestamptz,
  editorial_update_proposal jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, seo_ops
as $$
begin
  if p_reviewer_user_id is null
     or p_authenticated_subject is null
     or p_authenticated_subject <> p_reviewer_user_id::text
     or not exists (
       select 1 from seo_ops.editorial_reviewers r
       where r.user_id = p_reviewer_user_id and r.is_active = true
     ) then
    raise exception 'Reviewer is not active or authorized';
  end if;

  return query
  select o.id, r.id, o.slug, o.target_path, o.status,
         r.revision_number, r.content_hash, r.markdown,
         o.created_at, o.updated_at,
         o.payload -> 'editorialUpdateProposal'
  from seo_ops.content_operations o
  join lateral (
    select cr.id, cr.revision_number, cr.content_hash, cr.markdown
    from seo_ops.content_revisions cr
    where cr.operation_id = o.id
      and cr.content_hash = o.proposed_content_hash
      and cr.revision_state = 'PROPOSED'
    order by cr.revision_number desc
    limit 1
  ) r on true
  where o.status in ('PROPOSED','RESEARCHED','DRAFTED','AWAITING_APPROVAL')
  order by o.updated_at asc
  limit 100;
end;
$$;

revoke all on function public.seo_ops_list_pending_editorial_reviews(uuid, text) from public, anon, authenticated;
grant execute on function public.seo_ops_list_pending_editorial_reviews(uuid, text) to service_role;
