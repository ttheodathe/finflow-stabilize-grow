-- READ-ONLY PRODUCTION AGGREGATE QUERY.
-- The dedicated login can read only this private aggregate view, never source tables.
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
