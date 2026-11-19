create or replace function public.seo_ops_record_activation_snapshot(
  p_snapshot_date date,
  p_registered_users bigint,
  p_onboarding_completions bigint,
  p_activated_users bigint,
  p_returning_activated_users bigint,
  p_definition_version text,
  p_source_watermark timestamptz,
  p_limitations jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, seo_ops
as $$
declare v_id uuid;
begin
  insert into seo_ops.activation_snapshots(
    snapshot_date, registered_users, onboarding_completions, activated_users,
    returning_activated_users, definition_version, source_watermark, limitations
  ) values (
    p_snapshot_date, p_registered_users, p_onboarding_completions, p_activated_users,
    p_returning_activated_users, p_definition_version, p_source_watermark,
    coalesce(p_limitations, '[]'::jsonb)
  )
  on conflict (snapshot_date) do update
    set registered_users = excluded.registered_users,
        onboarding_completions = excluded.onboarding_completions,
        activated_users = excluded.activated_users,
        returning_activated_users = excluded.returning_activated_users,
        definition_version = excluded.definition_version,
        source_watermark = excluded.source_watermark,
        limitations = excluded.limitations
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.seo_ops_record_activation_snapshot(date,bigint,bigint,bigint,bigint,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.seo_ops_record_activation_snapshot(date,bigint,bigint,bigint,bigint,text,timestamptz,jsonb) to service_role;
