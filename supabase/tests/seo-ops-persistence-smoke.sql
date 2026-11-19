do $$
declare
  v_run uuid; v_run2 uuid; v_opp uuid; v_opp2 uuid; v_snap uuid; v_snap2 uuid;
  v_activation uuid; v_content uuid; v_content2 uuid; v_counts record; v_count integer; v_read_count integer;
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
  if v_counts.registered_users <> 6 or v_counts.onboarding_completions <> 5
     or v_counts.activated_users <> 2 or v_counts.returning_activated_users <> 1 then
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
     or not has_function_privilege('service_role','public.seo_ops_record_content_operation(text,text,text,text,text,jsonb,text,text)','EXECUTE') then
    raise exception 'SEO RPC execution grants are incorrect';
  end if;
end $$;
