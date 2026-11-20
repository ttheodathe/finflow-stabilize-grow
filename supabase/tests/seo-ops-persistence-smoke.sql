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
  if v_total <> 11 or v_rls <> 11 then raise exception 'expected RLS on all 11 SEO tables; total %, enabled %',v_total,v_rls; end if;
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
