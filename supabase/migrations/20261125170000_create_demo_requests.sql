-- Private, server-managed demo enquiries. Public visitors submit through the
-- server route only; no browser role can read or modify lead records.
create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  business_name text not null check (char_length(business_name) between 2 and 160),
  email text not null check (char_length(email) between 3 and 320),
  business_type text not null check (
    business_type in ('small_business', 'freelancer', 'startup', 'nonprofit', 'agency', 'other')
  ),
  challenge text not null check (char_length(challenge) between 20 and 2000),
  preferred_time text not null check (
    preferred_time in ('morning', 'afternoon', 'evening', 'flexible')
  ),
  phone text check (phone is null or char_length(phone) <= 40),
  demo_contact_consent boolean not null default false check (demo_contact_consent = true),
  marketing_consent boolean not null default false,
  submission_fingerprint text not null unique check (submission_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'closed', 'spam')),
  created_at timestamptz not null default now()
);

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);

create index if not exists demo_requests_status_created_at_idx
  on public.demo_requests (status, created_at desc);

-- Store only an HMAC of the network address. The server derives the HMAC with
-- its server-only Supabase secret; raw IP addresses are never persisted.
create table if not exists public.demo_request_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count between 1 and 4)
);

alter table public.demo_requests enable row level security;
alter table public.demo_request_rate_limits enable row level security;

-- These tables are intentionally inaccessible to browser roles. The trusted
-- server route uses the service-role client after validating every field.
revoke all on table public.demo_requests from public, anon, authenticated;
revoke all on table public.demo_request_rate_limits from public, anon, authenticated;
grant insert, select on table public.demo_requests to service_role;
grant select, insert, update, delete on table public.demo_request_rate_limits to service_role;

-- Atomic, database-backed hourly limit: at most three accepted requests per
-- HMAC'd IP in a rolling fixed one-hour window. Only service_role may execute.
create or replace function public.consume_demo_request_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  delete from public.demo_request_rate_limits
  where window_started_at < now() - interval '24 hours';

  insert into public.demo_request_rate_limits as current_limit
    (ip_hash, window_started_at, request_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_started_at = case
          when current_limit.window_started_at <= now() - interval '1 hour' then now()
          else current_limit.window_started_at
        end,
        request_count = case
          when current_limit.window_started_at <= now() - interval '1 hour' then 1
          else current_limit.request_count + 1
        end
  returning request_count into v_count;

  return v_count <= 3;
end;
$$;

revoke all on function public.consume_demo_request_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_demo_request_rate_limit(text) to service_role;
