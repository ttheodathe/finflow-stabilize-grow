-- Isolated SEO operations persistence. Private schema; no browser/Data API access.
create schema if not exists seo_ops;
revoke all on schema seo_ops from public, anon, authenticated;
grant usage on schema seo_ops to service_role;

create table if not exists seo_ops.scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  scheduler_key text not null check (scheduler_key in ('SEARCH_INTELLIGENCE','CONTENT_OPERATIONS','PERFORMANCE_AND_LEARNING')),
  scheduled_for date not null,
  attempt integer not null default 1 check (attempt > 0),
  status text not null check (status in ('RUNNING','SUCCEEDED','PARTIAL','FAILED','SKIPPED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  upstream_run_id uuid references seo_ops.scheduler_runs(id),
  output jsonb not null default '{}'::jsonb,
  error_summary text,
  unique (scheduler_key, scheduled_for, attempt)
);

create table if not exists seo_ops.opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_key text not null unique,
  scheduler_run_id uuid not null references seo_ops.scheduler_runs(id),
  target_url text,
  query_text text,
  opportunity_type text not null,
  score numeric(8,3) not null check (score >= 0),
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists seo_ops.research_records (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references seo_ops.opportunities(id),
  source_url text not null,
  source_title text,
  source_published_at date,
  retrieved_at timestamptz not null default now(),
  supported_claims jsonb not null default '[]'::jsonb,
  unresolved_claims jsonb not null default '[]'::jsonb,
  unique (opportunity_id, source_url)
);

create table if not exists seo_ops.content_operations (
  id uuid primary key default gen_random_uuid(),
  operation_key text not null unique,
  operation_type text not null check (operation_type in ('NEW_ARTICLE','EXISTING_ARTICLE_UPDATE')),
  target_path text not null,
  slug text not null,
  status text not null check (status in ('PROPOSED','RESEARCHED','DRAFTED','AWAITING_APPROVAL','APPROVED','COMMITTED','DEPLOYMENT_PENDING','DEPLOYMENT_READY','URL_VERIFIED','FAILED','ROLLED_BACK')),
  proposed_content_hash text,
  approved_content_hash text,
  expected_blob_sha text,
  committed_blob_sha text,
  commit_sha text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists seo_ops.content_revisions (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references seo_ops.content_operations(id),
  revision_number integer not null check (revision_number > 0),
  content_hash text not null,
  markdown text not null,
  revision_state text not null check (revision_state in ('PROPOSED','APPROVED','COMMITTED','SUPERSEDED','ROLLED_BACK')),
  created_at timestamptz not null default now(),
  unique (operation_id, revision_number),
  unique (operation_id, content_hash)
);

create table if not exists seo_ops.editorial_approvals (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references seo_ops.content_operations(id),
  github_pr_number bigint not null,
  github_review_id bigint not null unique,
  reviewer_login text not null,
  reviewer_permission text not null check (reviewer_permission in ('write','maintain','admin')),
  reviewed_commit_sha text not null,
  content_hash text not null,
  target_path text not null,
  operation_type text not null check (operation_type in ('NEW_ARTICLE','EXISTING_ARTICLE_UPDATE')),
  approved_at timestamptz not null,
  revoked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb
);

create table if not exists seo_ops.deployment_verifications (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references seo_ops.content_operations(id),
  vercel_deployment_id text,
  commit_sha text not null,
  preview_url text not null,
  deployment_state text not null check (deployment_state in ('PENDING','BUILDING','READY','ERROR','CANCELED','BLOCKED')),
  url_status integer,
  canonical_url text,
  noindex_detected boolean,
  sitemap_contains_url boolean,
  rss_contains_url boolean,
  verified_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists seo_ops.rollback_events (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references seo_ops.content_operations(id),
  reason text not null,
  expected_current_hash text not null,
  restored_content_hash text,
  rollback_commit_sha text,
  status text not null check (status in ('STARTED','SUCCEEDED','FAILED','REFUSED_CONCURRENT_CHANGE')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists seo_ops.performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  scheduler_run_id uuid references seo_ops.scheduler_runs(id),
  period_start date not null,
  period_end date not null,
  source text not null check (source in ('GSC','GA4','SUPABASE_ACTIVATION','CONTENT_OUTCOME')),
  metrics jsonb not null,
  collected_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists seo_ops.activation_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  registered_users bigint,
  onboarding_completions bigint,
  activated_users bigint,
  returning_activated_users bigint,
  definition_version text not null,
  source_watermark timestamptz,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (registered_users is null or registered_users >= 0),
  check (onboarding_completions is null or onboarding_completions >= 0),
  check (activated_users is null or activated_users >= 0),
  check (returning_activated_users is null or returning_activated_users >= 0)
);

create table if not exists seo_ops.attribution_touchpoints (
  id uuid primary key default gen_random_uuid(),
  visitor_key_hash text not null,
  consent_status text not null check (consent_status in ('GRANTED','DENIED','UNKNOWN')),
  first_source text,
  first_medium text,
  first_landing_page text,
  first_touch_at timestamptz,
  registered_at timestamptz,
  onboarding_completed_at timestamptz,
  activated_at timestamptz,
  attribution_class text not null default 'UNKNOWN' check (attribution_class in ('DIRECTLY_ATTRIBUTED','ASSISTED','AGGREGATE_CORRELATION','UNKNOWN')),
  content_operation_key text,
  created_at timestamptz not null default now(),
  unique (visitor_key_hash)
);

do $$
declare t text;
begin
  foreach t in array array[
    'scheduler_runs','opportunities','research_records','content_operations',
    'content_revisions','editorial_approvals','deployment_verifications',
    'rollback_events','performance_snapshots','activation_snapshots',
    'attribution_touchpoints'
  ] loop
    execute format('alter table seo_ops.%I enable row level security', t);
    execute format('create policy service_role_full_access on seo_ops.%I for all to service_role using (true) with check (true)', t);
    execute format('revoke all on table seo_ops.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on table seo_ops.%I to service_role', t);
  end loop;
end $$;

alter default privileges in schema seo_ops revoke all on tables from public, anon, authenticated;
alter default privileges in schema seo_ops grant select, insert, update, delete on tables to service_role;
