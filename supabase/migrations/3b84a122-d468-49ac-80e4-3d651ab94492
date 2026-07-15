
create type public.company_member_role as enum
  ('owner','admin','accountant','sales','inventory','hr','payroll','viewer');

create type public.company_member_status as enum ('active','invited','suspended');

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.company_member_role not null default 'viewer',
  status public.company_member_status not null default 'active',
  invited_by uuid references auth.users(id),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index idx_company_members_company on public.company_members(company_id);
create index idx_company_members_user on public.company_members(user_id);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.company_member_role not null default 'viewer',
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_company_invitations_company on public.company_invitations(company_id);
create index idx_company_invitations_email on public.company_invitations(lower(email));

alter table public.company_members enable row level security;
alter table public.company_invitations enable row level security;

-- SECURITY DEFINER helpers to avoid RLS recursion
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.get_company_role(p_company_id uuid)
returns public.company_member_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.company_members
  where company_id = p_company_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner','admin')
  );
$$;

-- backfill: every existing company gets an owner company_member row from companies.user_id
insert into public.company_members (company_id, user_id, role, status, joined_at)
select c.id, c.user_id, 'owner', 'active', now()
from public.companies c
on conflict (company_id, user_id) do nothing;

-- company_members policies
create policy "members view their company roster"
  on public.company_members for select
  using (public.is_company_member(company_id) or user_id = auth.uid());

create policy "admins manage company members"
  on public.company_members for all
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

-- company_invitations policies
create policy "admins manage company invitations"
  on public.company_invitations for all
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

-- companies: replace old single-owner policy with company_members-based access
drop policy if exists "own companies" on public.companies;

create policy "company members view companies"
  on public.companies for select
  using (public.is_company_member(id));

create policy "company admins update companies"
  on public.companies for update
  using (public.is_company_admin(id))
  with check (public.is_company_admin(id));

create policy "company owner deletes company"
  on public.companies for delete
  using (public.get_company_role(id) = 'owner');
