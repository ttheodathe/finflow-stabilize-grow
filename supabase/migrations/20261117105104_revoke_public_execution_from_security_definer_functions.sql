-- SECURITY DEFINER routines in public must not inherit PostgreSQL's default
-- PUBLIC EXECUTE grant. Preserve authenticated/service_role grants, while
-- keeping only the deliberately public invoice and invitation lookup RPCs
-- callable by anon.

do $block$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_catalog.oidvectortypes(p.proargtypes) as argtypes
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and exists (
        select 1
        from pg_catalog.aclexplode(
          coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
        ) a
        where a.grantee=0 and a.privilege_type='EXECUTE'
      )
      and p.proname not in ('get_public_invoice','get_public_team_invitation')
  loop
    execute pg_catalog.format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.argtypes
    );
  end loop;
end
$block$;

revoke all on function public.get_public_invoice(uuid) from public, anon;
grant execute on function public.get_public_invoice(uuid) to anon, authenticated;

alter function public.generate_inbound_token() set search_path = pg_catalog;
alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.set_updated_at_inbound_email_events() set search_path = pg_catalog;
