-- Stage E.1: expose the fixed activation aggregate only through the OIDC-gated reader Edge Function.
-- The Postgres role remains NOLOGIN. service_role access is server-only and is never placed in a browser.
grant usage on schema seo_private to service_role;
grant select on seo_private.activation_aggregate to service_role;

create or replace function public.seo_ops_read_activation_aggregate()
returns table (
  source_watermark timestamptz,
  registered_users_all_time bigint,
  onboarding_completions_all_time bigint,
  activated_users_all_time bigint,
  returning_activated_users_all_time bigint,
  new_registrations_30d bigint,
  new_onboarding_completions_30d bigint,
  new_activated_users_30d bigint,
  new_returning_activated_users_30d bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, seo_private
as $$
  select
    source_watermark,
    registered_users_all_time,
    onboarding_completions_all_time,
    activated_users_all_time,
    returning_activated_users_all_time,
    new_registrations_30d,
    new_onboarding_completions_30d,
    new_activated_users_30d,
    new_returning_activated_users_30d
  from seo_private.activation_aggregate;
$$;

revoke all on function public.seo_ops_read_activation_aggregate()
  from public, anon, authenticated;
grant execute on function public.seo_ops_read_activation_aggregate()
  to service_role;
