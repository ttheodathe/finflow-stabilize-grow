-- CI-only security and result assertions for the Stage B2 aggregate view.
do $$
declare
  v record;
  v_column_count integer;
begin
  if not exists (
    select 1 from pg_roles
    where rolname='seo_activation_aggregator'
      and not rolcanlogin and not rolsuper and not rolcreatedb
      and not rolcreaterole and not rolreplication and not rolbypassrls
  ) then
    raise exception 'aggregator role attributes are not least-privilege';
  end if;

  if not exists (
    select 1 from pg_roles
    where rolname='seo_activation_reader'
      and not rolcanlogin and not rolsuper and not rolcreatedb
      and not rolcreaterole and not rolreplication and not rolbypassrls
  ) then
    raise exception 'reader role must remain NOLOGIN until an operator configures its credential';
  end if;

  if pg_has_role('seo_activation_reader','seo_activation_aggregator','MEMBER') then
    raise exception 'reader must not inherit or assume aggregator role';
  end if;

  if exists (
    select 1
    from pg_auth_members am
    join pg_roles granted_role on granted_role.oid = am.roleid
    join pg_roles member_role on member_role.oid = am.member
    where granted_role.rolname in ('seo_activation_aggregator', 'seo_activation_reader')
       or member_role.rolname in ('seo_activation_aggregator', 'seo_activation_reader')
  ) then
    raise exception 'dedicated roles unexpectedly have role memberships';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles', 'onboarding_progress', 'invoices', 'expenses')
      and c.relowner = 'seo_activation_aggregator'::regrole
  ) then
    raise exception 'aggregator unexpectedly owns a source table';
  end if;

  if has_table_privilege('seo_activation_reader','public.profiles','SELECT')
     or has_table_privilege('seo_activation_reader','public.onboarding_progress','SELECT')
     or has_table_privilege('seo_activation_reader','public.invoices','SELECT')
     or has_table_privilege('seo_activation_reader','public.expenses','SELECT') then
    raise exception 'reader unexpectedly has direct source-table SELECT';
  end if;

  if has_table_privilege('seo_activation_reader','public.profiles','INSERT')
     or has_table_privilege('seo_activation_reader','public.profiles','UPDATE')
     or has_table_privilege('seo_activation_reader','public.profiles','DELETE')
     or has_table_privilege('seo_activation_reader','seo_private.activation_aggregate','INSERT')
     or has_table_privilege('seo_activation_reader','seo_private.activation_aggregate','UPDATE')
     or has_table_privilege('seo_activation_reader','seo_private.activation_aggregate','DELETE') then
    raise exception 'reader unexpectedly has write privileges';
  end if;

  if not has_column_privilege('seo_activation_aggregator','public.profiles','id','SELECT')
     or not has_column_privilege('seo_activation_aggregator','public.profiles','created_at','SELECT')
     or has_column_privilege('seo_activation_aggregator','public.profiles','id','UPDATE')
     or has_column_privilege('seo_activation_aggregator','public.profiles','created_at','INSERT') then
    raise exception 'aggregator source-column privileges are incorrect';
  end if;

  if not has_schema_privilege('seo_activation_reader','seo_private','USAGE')
     or has_schema_privilege('seo_activation_reader','seo_private','CREATE')
     or not has_table_privilege('seo_activation_reader','seo_private.activation_aggregate','SELECT') then
    raise exception 'reader view-only schema grants are incorrect';
  end if;
  if has_schema_privilege('anon','seo_private','USAGE')
     or has_schema_privilege('authenticated','seo_private','USAGE')
     or has_table_privilege('anon','seo_private.activation_aggregate','SELECT')
     or has_table_privilege('authenticated','seo_private.activation_aggregate','SELECT') then
    raise exception 'browser roles unexpectedly have access to the private activation view';
  end if;

  select count(*) into v_column_count
  from pg_attribute
  where attrelid='seo_private.activation_aggregate'::regclass
    and attnum > 0 and not attisdropped;
  if v_column_count <> 9 then
    raise exception 'aggregate view must expose exactly nine output columns, found %',v_column_count;
  end if;

  select relowner::regrole::text as owner_name into v
  from pg_class where oid='seo_private.activation_aggregate'::regclass;
  if v.owner_name <> 'seo_activation_aggregator' then
    raise exception 'aggregate view owner is not the restricted non-login role';
  end if;
end
$$;

set role seo_activation_reader;
do $$
declare
  v record;
  v_denied boolean := false;
begin
  select * into v from seo_private.activation_aggregate;
  if v.registered_users_all_time <> 4
     or v.onboarding_completions_all_time <> 3
     or v.activated_users_all_time <> 2
     or v.returning_activated_users_all_time <> 1
     or v.new_registrations_30d <> 3
     or v.new_onboarding_completions_30d <> 2
     or v.new_activated_users_30d <> 1
     or v.new_returning_activated_users_30d <> 1 then
    raise exception 'aggregate view returned unexpected fixture counts: %', row_to_json(v);
  end if;

  begin
    execute 'select id from public.profiles limit 1';
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'reader unexpectedly selected a source-table identifier';
  end if;

  v_denied := false;
  begin
    execute 'insert into public.profiles(id,created_at) values (gen_random_uuid(),now())';
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'reader unexpectedly inserted into a source table';
  end if;
end
$$;
reset role;
