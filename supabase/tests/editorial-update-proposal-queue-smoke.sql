-- Confirms the authenticated reviewer queue returns the persisted duplicate-check update plan.
do $$
declare
  v_reviewer uuid := gen_random_uuid();
  v_operation uuid;
  v_revision uuid;
  v_hash text := repeat('f',64);
  v_plan jsonb := jsonb_build_object(
    'action','UPDATE_EXISTING_PUBLIC_ARTICLE',
    'targetSlug','small-business-bookkeeping',
    'targetUrl','https://www.finflowtrack.com/blog/small-business-bookkeeping',
    'matchType','EXACT_GSC_LANDING_PAGE',
    'confidence','EXACT_URL_MATCH',
    'rationale','The existing public article is already the landing page for this query.',
    'recommendedActions',jsonb_build_array('Keep the existing URL.','Add missing, useful reader guidance.')
  );
  v_payload jsonb;
  v_action text;
  v_target_url text;
begin
  insert into seo_ops.editorial_reviewers(user_id,is_active,reviewer_role)
  values (v_reviewer,true,'EDITOR');

  v_payload := jsonb_build_object(
    'workflowState','PERSISTED_PENDING_READBACK',
    'editorialUpdateProposal',v_plan
  );

  v_operation := public.seo_ops_record_content_operation(
    'editorial-update-plan-smoke-' || gen_random_uuid()::text,
    'EXISTING_ARTICLE_UPDATE',
    'content/blog/small-business-bookkeeping.md',
    'small-business-bookkeeping',
    'PROPOSED',
    v_payload,
    v_hash,
    null
  );

  v_revision := public.seo_ops_advance_content_revision(
    v_operation,
    1,
    v_hash,
    '---' || E'\\n' || 'title: Update smoke draft' || E'\\n' || '---' || E'\\n' || '# Update smoke draft',
    null,
    v_payload
  );

  select editorial_update_proposal ->> 'action',
         editorial_update_proposal ->> 'targetUrl'
    into v_action, v_target_url
  from public.seo_ops_list_pending_editorial_reviews(v_reviewer,v_reviewer::text)
  where operation_id = v_operation
    and revision_id = v_revision;

  if v_action <> 'UPDATE_EXISTING_PUBLIC_ARTICLE'
     or v_target_url <> 'https://www.finflowtrack.com/blog/small-business-bookkeeping' then
    raise exception 'Reviewer queue did not return the persisted public-article update proposal';
  end if;
end $$;
