do $$
declare
  v_run uuid; v_run2 uuid; v_opp uuid; v_opp2 uuid; v_snap uuid; v_snap2 uuid;
  v_activation uuid; v_content uuid; v_content2 uuid; v_research uuid;
  v_revision uuid; v_revision2 uuid; v_revision_state text;
  v_counts record; v_count integer; v_read_count integer;
  v_attempt integer := extract(epoch from clock_timestamp())::integer;
begin
  v_run := public.seo_ops_record_run('SEARCH_INTELLIGENCE',date '2026-11-20',v_attempt,'RUNNING','{"fixture":true}'::jsonb);
  v_run2 := public.seo_ops_record_run('SEARCH_INTELLIGENCE',date '2026-11-20',v_attempt,'SUCCEEDED','{"fixture":true,"done":true}'::jsonb);
  if v_run <> v_run2 then raise exception 'scheduler run idempotency failed'; end if;
  begin
    perform public.seo_ops_record_run('SEARCH_INTELLIGENCE',date '2026-11-20',v_attempt,'RUNNING','{}'::jsonb);
    raise exception 'terminal scheduler run transition was not blocked';
  exception when raise_exception then
    if sqlerrm = 'terminal scheduler run transition was not blocked' then raise; end if;
  end;

  v_opp := public.seo_ops_record_opportunity('ci-fixture-opportunity',v_run,'https://example.test/blog/a','fixture query','REVIEW_EXISTING_PAGE',50,'{"impressions":100}'::jsonb);
  v_opp2 := public.seo_ops_record_opportunity('ci-fixture-opportunity',v_run,'https://example.test/blog/a','fixture query','REVIEW_EXISTING_PAGE',55,'{"impressions":120}'::jsonb);
  if v_opp <> v_opp2 then raise exception 'opportunity idempotency failed'; end if;
  select count(*) into v_read_count from public.seo_ops_get_opportunities(v_run)
   where id = v_opp and source_run_output->>'fixture' = 'true';
  if v_read_count <> 1 then raise exception 'persisted opportunity read RPC lost source id/run fixture metadata'; end if;

  v_research := public.seo_ops_record_research_record(
    v_opp,'https://example.test/fixture-source','Fixture source',null,now(),
    '[{"id":"fixture-claim","text":"Fixture-only claim","verificationStatus":"TEST_ONLY"}]'::jsonb,
    '[]'::jsonb
  );
  select count(*) into v_count from seo_ops.research_records
   where id=v_research and opportunity_id=v_opp
     and supported_claims @> '[{"id":"fixture-claim"}]'::jsonb;
  if v_count <> 1 then raise exception 'source research record or claim mapping was not persisted'; end if;
  select count(*) into v_count from seo_ops.opportunities where opportunity_key='ci-fixture-opportunity';
  if v_count <> 1 then raise exception 'duplicate opportunity record was created'; end if;

  v_snap := public.seo_ops_record_performance_snapshot('ci-fixture-performance',v_run,date '2026-11-01',date '2026-11-07','GSC','{"clicks":3}'::jsonb);
  v_snap2 := public.seo_ops_record_performance_snapshot('ci-fixture-performance',v_run,date '2026-11-01',date '2026-11-07','GSC','{"clicks":4}'::jsonb);
  if v_snap <> v_snap2 then raise exception 'performance snapshot idempotency failed'; end if;

  v_content := public.seo_ops_record_content_operation(
    'ci-fixture-content-operation','EXISTING_ARTICLE_UPDATE','content/blog/cash-flow.md',
    'cash-flow','PROPOSED','{"validation":"RESEARCH_REQUIRED"}'::jsonb
  );
  v_content2 := public.seo_ops_record_content_operation(
    'ci-fixture-content-operation','EXISTING_ARTICLE_UPDATE','content/blog/cash-flow.md',
    'cash-flow','PROPOSED','{"validation":"RESEARCH_REQUIRED"}'::jsonb
  );
  if v_content <> v_content2 then raise exception 'content operation idempotency failed'; end if;
  v_revision := public.seo_ops_record_content_revision(
    v_content,1,repeat('a',64),'# Fixture-only draft','PROPOSED'
  );
  v_revision2 := public.seo_ops_record_content_revision(
    v_content,1,repeat('a',64),'# Fixture-only draft','PROPOSED'
  );
  if v_revision <> v_revision2 then
    raise exception 'identical content revision retry did not return the original ID';
  end if;

  -- Simulate a later authorized workflow transition. A retry must preserve it.
  update seo_ops.content_revisions
     set revision_state='APPROVED'
   where id=v_revision;
  v_revision2 := public.seo_ops_record_content_revision(
    v_content,1,repeat('a',64),'# Fixture-only draft','PROPOSED'
  );
  select revision_state into v_revision_state
    from seo_ops.content_revisions where id=v_revision;
  if v_revision2 <> v_revision or v_revision_state <> 'APPROVED' then
    raise exception 'revision retry changed identity or downgraded an approved revision';
  end if;

  v_revision2 := public.seo_ops_record_content_revision(
    v_content,2,repeat('b',64),'# Second fixture-only draft','PROPOSED'
  );
  if v_revision2 = v_revision then
    raise exception 'distinct content revision reused an existing revision ID';
  end if;

  select count(*) into v_count from seo_ops.content_revisions
   where id=v_revision and operation_id=v_content
     and content_hash=repeat('a',64) and revision_state='APPROVED';
  if v_count <> 1 then raise exception 'draft revision was not durably persisted'; end if;

  begin
    perform public.seo_ops_record_content_revision(
      v_content,3,repeat('a',64),'# Fixture-only draft','PROPOSED'
    );
    raise exception 'same hash with a different revision number was not blocked';
  exception when raise_exception then
    if sqlerrm = 'same hash with a different revision number was not blocked' then raise; end if;
  end;

  begin
    perform public.seo_ops_record_content_revision(
      v_content,1,repeat('c',64),'# Fixture-only draft','PROPOSED'
    );
    raise exception 'same revision number with a different hash was not blocked';
  exception when raise_exception then
    if sqlerrm = 'same revision number with a different hash was not blocked' then raise; end if;
  end;

  begin
    perform public.seo_ops_record_content_revision(
      v_content,1,repeat('a',64),'# Altered markdown','PROPOSED'
    );
    raise exception 'same hash with altered markdown was not blocked';
  exception when raise_exception then
    if sqlerrm = 'same hash with altered markdown was not blocked' then raise; end if;
  end;

  begin
    perform public.seo_ops_record_content_revision(
      v_content,1,repeat('b',64),'# Second fixture-only draft','PROPOSED'
    );
    raise exception 'crossed revision-number/hash conflicts were not blocked';
  exception when raise_exception then
    if sqlerrm = 'crossed revision-number/hash conflicts were not blocked' then raise; end if;
  end;

  begin
    perform public.seo_ops_record_content_revision(
      v_content,3,repeat('d',64),'# Invalid state draft','APPROVED'
    );
    raise exception 'non-PROPOSED revision creation state was not blocked';
  exception when raise_exception then
    if sqlerrm = 'non-PROPOSED revision creation state was not blocked' then raise; end if;
  end;

  select count(*) into v_count
  from public.seo_ops_get_content_operation(v_content)
  where id = v_content and status = 'PROPOSED'
    and payload->>'validation' = 'RESEARCH_REQUIRED';
  if v_count <> 1 then raise exception 'content operation independent readback failed'; end if;

  select count(*) into v_count
  from public.seo_ops_get_research_records(v_opp)
  where id = v_research and source_url = 'https://example.test/fixture-source';
  if v_count <> 1 then raise exception 'research record independent readback failed'; end if;

  select count(*) into v_count
  from public.seo_ops_get_content_revisions(v_content)
  where id = v_revision and content_hash = repeat('a',64)
    and markdown = '# Fixture-only draft' and revision_state = 'APPROVED';
  if v_count <> 1 then raise exception 'content revision independent readback failed'; end if;
  begin
    perform public.seo_ops_record_content_operation(
      'ci-fixture-content-operation','EXISTING_ARTICLE_UPDATE','content/blog/other.md',
      'other','PROPOSED','{}'::jsonb
    );
    raise exception 'content operation key target rebinding was not blocked';
  exception when raise_exception then
    if sqlerrm = 'content operation key target rebinding was not blocked' then raise; end if;
  end;

  select * into v_counts from seo_ops_test.compute_activation_counts('2026-11-20T00:00:00Z');
  if v_counts.registered_users <> 8 or v_counts.onboarding_completions <> 7
     or v_counts.activated_users <> 3 or v_counts.returning_activated_users <> 1 then
    raise exception 'activation fixture returned unexpected counts: %',row_to_json(v_counts);
  end if;
  v_activation := public.seo_ops_record_activation_snapshot(
    date '2026-11-20',v_counts.registered_users,v_counts.onboarding_completions,
    v_counts.activated_users,v_counts.returning_activated_users,'activation-fixture-v1',
    '2026-11-20T00:00:00Z',
    '["Synthetic acceptance fixture only","Expense schema has no status field; persisted rows are treated as active"]'::jsonb
  );
  if v_activation is null then raise exception 'activation snapshot was not persisted'; end if;
end $$;

do $$
declare v_total integer; v_rls integer;
begin
  select count(*),count(*) filter (where c.relrowsecurity)
    into v_total,v_rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='seo_ops' and c.relkind='r';
  if v_total <> 16 or v_rls <> 16 then raise exception 'expected RLS on all 16 SEO tables; total %, enabled %',v_total,v_rls; end if;
  if has_schema_privilege('anon','seo_ops','USAGE')
     or has_schema_privilege('authenticated','seo_ops','USAGE')
     or has_table_privilege('anon','seo_ops.scheduler_runs','SELECT')
     or has_table_privilege('authenticated','seo_ops.scheduler_runs','SELECT') then
    raise exception 'browser roles have unexpected SEO schema access';
  end if;
  if not has_schema_privilege('service_role','seo_ops','USAGE')
     or not has_table_privilege('service_role','seo_ops.scheduler_runs','SELECT') then
    raise exception 'service_role lacks required SEO schema access';
  end if;
  if has_function_privilege('anon','public.seo_ops_record_run(text,date,integer,text,jsonb,uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_record_run(text,date,integer,text,jsonb,uuid,text)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_record_run(text,date,integer,text,jsonb,uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_record_content_operation(text,text,text,text,text,jsonb,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_record_content_operation(text,text,text,text,text,jsonb,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_record_content_operation(text,text,text,text,text,jsonb,text,text)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_get_opportunities(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_get_opportunities(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_get_opportunities(uuid)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_record_research_record(uuid,text,text,date,timestamptz,jsonb,jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_record_research_record(uuid,text,text,date,timestamptz,jsonb,jsonb)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_record_research_record(uuid,text,text,date,timestamptz,jsonb,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_record_content_revision(uuid,integer,text,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_record_content_revision(uuid,integer,text,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_record_content_revision(uuid,integer,text,text,text)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_get_content_operation(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_get_content_operation(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_get_content_operation(uuid)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_get_research_records(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_get_research_records(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_get_research_records(uuid)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_get_content_revisions(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_get_content_revisions(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_get_content_revisions(uuid)','EXECUTE') then
    raise exception 'SEO RPC execution grants are incorrect';
  end if;
end $$;

-- Stage C: authenticated approval is mediated by a verified subject and exact revision hash.
do $$
declare
  v_reviewer uuid := gen_random_uuid();
  v_operation uuid;
  v_revision uuid;
  v_revision2 uuid;
  v_revision3 uuid;
  v_approval uuid;
  v_performance uuid;
  v_publication_claim uuid;
  v_publication_result jsonb;
  v_second_claim jsonb;
  v_hash text := repeat('c',64);
  v_hash2 text := repeat('d',64);
  v_hash3 text := repeat('e',64);
  v_count integer;
begin
  insert into seo_ops.editorial_reviewers(user_id,is_active,reviewer_role)
    values (v_reviewer,true,'EDITOR');
  v_operation := public.seo_ops_record_content_operation(
    'stage-c-smoke-' || gen_random_uuid()::text,'NEW_ARTICLE',
    'content/blog/stage-c-smoke.md','stage-c-smoke','PROPOSED',
    '{"workflowState":"READY_FOR_HUMAN_REVIEW"}'::jsonb,v_hash,null
  );
  v_revision := public.seo_ops_advance_content_revision(
    v_operation,1,v_hash,'# Stage C smoke article',null,
    '{"workflowState":"PERSISTED_PENDING_READBACK","draftMarkdown":"# Stage C smoke article"}'::jsonb
  );
  v_revision2 := public.seo_ops_advance_content_revision(
    v_operation,2,v_hash2,'# Stage C smoke article revised',v_hash,
    '{"workflowState":"PERSISTED_PENDING_READBACK","draftMarkdown":"# Stage C smoke article revised"}'::jsonb
  );
  select count(*) into v_count from seo_ops.content_revisions
   where operation_id=v_operation and revision_number=1 and revision_state='SUPERSEDED';
  if v_count <> 1 then raise exception 'previous article revision was not superseded'; end if;
  v_approval := public.seo_ops_record_article_approval(
    v_operation,v_revision2,v_hash2,v_reviewer,v_reviewer::text,'CHANGES_REQUESTED','CI synthetic revision request'
  );
  v_revision3 := public.seo_ops_advance_content_revision(
    v_operation,3,v_hash3,'# Stage C smoke article final',v_hash2,
    '{"workflowState":"PERSISTED_PENDING_READBACK","draftMarkdown":"# Stage C smoke article final"}'::jsonb
  );
  select count(*) into v_count from seo_ops.content_revisions
   where operation_id=v_operation and revision_number=2 and revision_state='SUPERSEDED';
  if v_count <> 1 then raise exception 'revision after change request did not supersede the prior proposal'; end if;
  begin
    perform public.seo_ops_record_article_approval(
      v_operation,v_revision3,v_hash3,v_reviewer,v_reviewer::text,'APPROVED','CI approval without byline',null
    );
    raise exception 'approval without an approved byline should have failed';
  exception when others then
    if sqlerrm = 'approval without an approved byline should have failed' then raise; end if;
  end;

  begin
    perform public.seo_ops_record_article_approval(
      v_operation,v_revision3,v_hash3,v_reviewer,v_reviewer::text,'APPROVED','CI unapproved byline','Unapproved Author'
    );
    raise exception 'approval with an unapproved byline should have failed';
  exception when others then
    if sqlerrm = 'approval with an unapproved byline should have failed' then raise; end if;
  end;

  v_approval := public.seo_ops_record_article_approval(
    v_operation,v_revision3,v_hash3,v_reviewer,v_reviewer::text,'APPROVED','CI synthetic approval','FinFlowTrack Editorial Team'
  );
  select count(*) into v_count from public.seo_ops_get_article_approval(v_approval)
   where id=v_approval and reviewer_user_id=v_reviewer and content_hash=v_hash3
     and decision='APPROVED' and approved_author='FinFlowTrack Editorial Team';
  if v_count <> 1 then raise exception 'authenticated article approval readback failed'; end if;
  select count(*) into v_count from seo_ops.content_operations
   where id=v_operation and status='APPROVED' and approved_content_hash=v_hash3;
  if v_count <> 1 then raise exception 'approved operation did not bind exact revision hash'; end if;

  v_performance := public.seo_ops_record_article_performance(
    'stage-c-smoke-performance-' || gen_random_uuid()::text,
    v_operation,v_revision3,'stage-c-smoke',
    'https://www.finflowtrack.com/blog/stage-c-smoke','GSC',
    date '2026-11-01',date '2026-11-20',
    '{"clicks":4,"impressions":100,"ctr":0.04}'::jsonb,
    'PAGE_LEVEL_DIRECT','UNKNOWN'
  );
  select count(*) into v_count from seo_ops.article_performance_snapshots
   where id=v_performance and slug='stage-c-smoke' and revision_id=v_revision3 and revision_attribution='UNKNOWN';
  if v_count <> 1 then raise exception 'article performance snapshot persistence failed'; end if;

  -- Stage D: only an exact approved revision with an approved author can be claimed.
  v_publication_claim := gen_random_uuid();
  v_publication_result := public.seo_ops_claim_next_article_for_publication(v_publication_claim);
  if v_publication_result is null
     or v_publication_result->>'operationId' is distinct from v_operation::text
     or v_publication_result->>'revisionId' is distinct from v_revision3::text
     or v_publication_result->>'contentHash' is distinct from v_hash3
     or v_publication_result->>'approvedAuthor' is distinct from 'FinFlowTrack Editorial Team'
     or v_publication_result->>'targetPath' is distinct from 'content/blog/stage-c-smoke.md' then
    raise exception 'publisher claim did not return the exact approved article revision and byline: %',v_publication_result;
  end if;

  v_second_claim := public.seo_ops_claim_next_article_for_publication(gen_random_uuid());
  if v_second_claim is not null then
    raise exception 'publisher queue allowed a concurrent duplicate claim';
  end if;

  perform public.seo_ops_update_article_publication(
    v_publication_claim,'PULL_REQUEST_OPEN','seo-publish/stage-c-smoke-12345678',123
  );
  perform public.seo_ops_update_article_publication(
    v_publication_claim,'MERGED',null,null,repeat('a',40)
  );
  perform public.seo_ops_update_article_publication(
    v_publication_claim,'DEPLOYMENT_READY',null,null,null,null,'https://www.finflowtrack.com/blog/stage-c-smoke'
  );
  perform public.seo_ops_update_article_publication(
    v_publication_claim,'URL_VERIFIED',null,null,null,repeat('b',64),'https://www.finflowtrack.com/blog/stage-c-smoke'
  );
  select count(*) into v_count
  from seo_ops.article_publications p
  join seo_ops.content_operations o on o.id=p.operation_id
  where p.claim_id=v_publication_claim
    and p.status='URL_VERIFIED'
    and p.approved_author='FinFlowTrack Editorial Team'
    and p.published_content_hash=repeat('b',64)
    and o.status='URL_VERIFIED';
  if v_count <> 1 then raise exception 'publisher state transitions were not durably persisted'; end if;

  if to_regprocedure('public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text)') is not null then
    raise exception 'legacy approval RPC signature still permits approvals without an author';
  end if;
  if has_function_privilege('anon','public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_record_article_approval(uuid,uuid,text,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'article approval RPC execution grants are incorrect';
  end if;
  if has_table_privilege('anon','seo_ops.editorial_authors','SELECT')
     or has_table_privilege('authenticated','seo_ops.editorial_authors','SELECT')
     or not has_table_privilege('service_role','seo_ops.editorial_authors','SELECT') then
    raise exception 'editorial author allowlist grants are incorrect';
  end if;
  if has_table_privilege('anon','seo_ops.article_publications','SELECT')
     or has_table_privilege('authenticated','seo_ops.article_publications','SELECT')
     or not has_table_privilege('service_role','seo_ops.article_publications','SELECT')
     or has_table_privilege('anon','seo_ops.article_publications','INSERT')
     or has_table_privilege('authenticated','seo_ops.article_publications','INSERT') then
    raise exception 'article publication queue grants are incorrect';
  end if;
  if has_function_privilege('anon','public.seo_ops_claim_next_article_for_publication(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_claim_next_article_for_publication(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_claim_next_article_for_publication(uuid)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_update_article_publication(uuid,text,text,bigint,text,text,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_update_article_publication(uuid,text,text,bigint,text,text,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_update_article_publication(uuid,text,text,bigint,text,text,text,text)','EXECUTE') then
    raise exception 'article publication RPC grants are incorrect';
  end if;
  if has_table_privilege('anon','seo_ops.article_approvals','SELECT')
     or has_table_privilege('authenticated','seo_ops.article_approvals','SELECT')
     or has_table_privilege('service_role','seo_ops.article_approvals','UPDATE')
     or has_table_privilege('service_role','seo_ops.article_approvals','DELETE') then
    raise exception 'article approval ledger must be service-role-readable and append-only';
  end if;
  if has_function_privilege('anon','public.seo_ops_advance_content_revision(uuid,integer,text,text,text,jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_advance_content_revision(uuid,integer,text,text,text,jsonb)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_advance_content_revision(uuid,integer,text,text,text,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.seo_ops_get_article_approval(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_get_article_approval(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_get_article_approval(uuid)','EXECUTE') then
    raise exception 'Stage C revision or approval readback RPC grants are incorrect';
  end if;
end $;

 
do $
declare
  v_security_definer boolean;
begin
  select p.prosecdef into v_security_definer
  from pg_proc p
  where p.oid = to_regprocedure('public.seo_ops_list_pending_editorial_reviews(uuid,text)');

  if not found then
    raise exception 'review queue RPC is missing';
  end if;
  if v_security_definer is distinct from false then
    raise exception 'review queue RPC must use SECURITY INVOKER';
  end if;
  if has_function_privilege('anon','public.seo_ops_list_pending_editorial_reviews(uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_list_pending_editorial_reviews(uuid,text)','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_list_pending_editorial_reviews(uuid,text)','EXECUTE') then
    raise exception 'review queue RPC execution grants are incorrect';
  end if;
end $;
