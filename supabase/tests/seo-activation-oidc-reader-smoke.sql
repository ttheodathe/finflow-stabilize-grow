-- CI-only contract checks for the server-only activation aggregate RPC.
do $$
declare
  fn record;
begin
  select p.prosecdef, p.provolatile
    into fn
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='seo_ops_read_activation_aggregate'
    and pg_get_function_identity_arguments(p.oid)='';

  if not found then
    raise exception 'activation aggregate RPC is missing';
  end if;
  if fn.prosecdef then
    raise exception 'activation aggregate RPC must be SECURITY INVOKER';
  end if;
  if fn.provolatile <> 's' then
    raise exception 'activation aggregate RPC must be STABLE';
  end if;
  if has_function_privilege('anon','public.seo_ops_read_activation_aggregate()','EXECUTE')
     or has_function_privilege('authenticated','public.seo_ops_read_activation_aggregate()','EXECUTE')
     or not has_function_privilege('service_role','public.seo_ops_read_activation_aggregate()','EXECUTE') then
    raise exception 'activation aggregate RPC grants are not server-only';
  end if;
  if not has_schema_privilege('service_role','seo_private','USAGE')
     or not has_table_privilege('service_role','seo_private.activation_aggregate','SELECT') then
    raise exception 'service role lacks the exact aggregate-view read privileges';
  end if;
  if has_table_privilege('service_role','public.profiles','SELECT')
     or has_table_privilege('service_role','public.onboarding_progress','SELECT')
     or has_table_privilege('service_role','public.invoices','SELECT')
     or has_table_privilege('service_role','public.expenses','SELECT') then
    raise exception 'service role unexpectedly gained direct source-table access';
  end if;
  if has_table_privilege('anon','seo_private.activation_aggregate','SELECT')
     or has_table_privilege('authenticated','seo_private.activation_aggregate','SELECT') then
    raise exception 'public client role unexpectedly has aggregate view access';
  end if;
end;
$$;
