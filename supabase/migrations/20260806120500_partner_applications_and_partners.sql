-- Partner & Referral module, Phase 1, step 2: applications + partners.

create type public.partner_type as enum (
  'affiliate', 'bookkeeping_firm', 'accounting_firm', 'accountant',
  'tax_consultant', 'educator', 'influencer', 'reseller'
);

create type public.partner_application_status as enum (
  'pending', 'approved', 'rejected', 'needs_more_info'
);

create type public.partner_status as enum (
  'active', 'suspended', 'banned'
);

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: an applicant may not have a FinFlowTrack account yet.
  user_id uuid references auth.users(id) on delete set null,
  status public.partner_application_status not null default 'pending',
  partner_type public.partner_type not null,
  business_name text not null,
  website text,
  country text not null,
  industry text,
  business_type text,
  linkedin_url text,
  contact_email text not null,
  phone text,
  monthly_audience text,
  approx_clients text,
  motivation text,
  experience text,
  marketing_channels text[],
  terms_accepted boolean not null default false,
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_applications_status_idx on public.partner_applications (status, created_at desc);
create index partner_applications_user_id_idx on public.partner_applications (user_id);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.partner_applications(id) on delete set null,
  partner_type public.partner_type not null,
  status public.partner_status not null default 'active',
  business_name text not null,
  referral_code text not null,
  -- Recurring-commission rate as a percentage (e.g. 20.00 = 20%). Phase 1
  -- only supports recurring-% commissions; flat/hybrid/per-plan rules are
  -- Phase 3 (multi-tier / advanced commission engine).
  commission_rate numeric(5,2) not null default 20.00 check (commission_rate >= 0 and commission_rate <= 100),
  payout_email text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (referral_code)
);

create index partners_status_idx on public.partners (status);

grant select, insert, update on public.partner_applications to authenticated, anon;
grant all on public.partner_applications to service_role;
grant select on public.partners to authenticated;
grant all on public.partners to service_role;

alter table public.partner_applications enable row level security;
alter table public.partners enable row level security;

-- Applications: anyone (incl. anonymous, pre-signup) can submit one.
create policy "anyone can submit a partner application" on public.partner_applications
  for insert to anon, authenticated
  with check (status = 'pending' and reviewed_by is null and reviewed_at is null);

create policy "applicant can view own application" on public.partner_applications
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_staff());

create policy "staff can review applications" on public.partner_applications
  for update to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

-- Partners: a partner can see their own record; staff can see all.
create policy "partner can view own record" on public.partners
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_staff());

create policy "staff can manage partners" on public.partners
  for all to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

-- Referral codes: short, URL-safe, collision-checked.
create or replace function public.generate_partner_referral_code(p_business_name text)
returns text
language plpgsql
as $$
declare
  v_base text;
  v_code text;
  v_suffix int := 0;
begin
  v_base := lower(regexp_replace(coalesce(p_business_name, 'partner'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  v_base := left(v_base, 20);
  if v_base = '' then v_base := 'partner'; end if;

  v_code := v_base;
  while exists (select 1 from public.partners where referral_code = v_code) loop
    v_suffix := v_suffix + 1;
    v_code := v_base || '-' || v_suffix::text;
  end loop;

  return v_code;
end;
$$;

-- Approval workflow. SECURITY DEFINER so a staff user (who has no direct
-- insert grant on partners beyond RLS "all") can atomically flip the
-- application and create the partner row together.
create or replace function public.approve_partner_application(
  p_application_id uuid,
  p_commission_rate numeric default 20.00
)
returns public.partners
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_app public.partner_applications;
  v_partner public.partners;
  v_code text;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  select * into v_app from public.partner_applications where id = p_application_id for update;
  if not found then
    raise exception 'application not found';
  end if;
  if v_app.user_id is null then
    raise exception 'application has no linked account yet; ask the applicant to sign up before approving';
  end if;

  v_code := public.generate_partner_referral_code(v_app.business_name);

  insert into public.partners (
    user_id, application_id, partner_type, business_name, referral_code,
    commission_rate, created_by
  ) values (
    v_app.user_id, v_app.id, v_app.partner_type, v_app.business_name, v_code,
    coalesce(p_commission_rate, 20.00), auth.uid()
  )
  returning * into v_partner;

  update public.partner_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_application_id;

  return v_partner;
end;
$$;

create or replace function public.set_partner_application_status(
  p_application_id uuid,
  p_status public.partner_application_status,
  p_admin_notes text default null
)
returns public.partner_applications
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partner_applications;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;
  if p_status = 'approved' then
    raise exception 'use approve_partner_application() to approve';
  end if;

  update public.partner_applications
  set status = p_status, admin_notes = coalesce(p_admin_notes, admin_notes),
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_application_id
  returning * into v_row;

  if not found then raise exception 'application not found'; end if;
  return v_row;
end;
$$;

grant execute on function public.approve_partner_application(uuid, numeric) to authenticated;
grant execute on function public.set_partner_application_status(uuid, public.partner_application_status, text) to authenticated;

notify pgrst, 'reload schema';
