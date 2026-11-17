-- Partner & Referral module, Phase 1, step 1: platform-staff flag.
--
-- Every existing role (owner/admin/accountant/manager/employee/viewer) is
-- scoped inside a single tenant company (company_members.role_id). There is
-- currently no concept of a FinFlowTrack-staff / platform-admin user, which
-- the partner-approval workflow needs (approving a partner is not a
-- per-company action). Adding a minimal, explicit flag rather than
-- overloading the existing per-company role system.

alter table public.profiles
  add column if not exists is_staff boolean not null default false;

comment on column public.profiles.is_staff is
  'Platform-level staff flag (FinFlowTrack/2005CLG team). Not related to '
  'company_members roles, which are per-tenant. Used to gate partner '
  'program administration (application review, commission adjustments).';

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select is_staff from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_platform_staff() to authenticated;
