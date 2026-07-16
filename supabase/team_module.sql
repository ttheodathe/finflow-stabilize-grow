-- =====================================================================
-- Team module: roles, permissions, role_permissions, team_invitations,
-- company_members.role_id migration, seat usage/limit RPCs, RLS + grants.
-- Apply this file via the Supabase SQL editor OR save as a timestamped
-- migration under supabase/migrations/ (e.g. 20260716120000_team.sql).
-- Idempotent: safe to re-run.
-- =====================================================================

-- 1. permissions catalog (global)
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);
grant select on public.permissions to anon, authenticated;
grant all on public.permissions to service_role;
alter table public.permissions enable row level security;
drop policy if exists "permissions readable" on public.permissions;
create policy "permissions readable" on public.permissions for select using (true);

insert into public.permissions (key, category, label, description) values
  ('users.invite',       'Team',      'Invite users',            'Send invitations to new members'),
  ('users.remove',       'Team',      'Remove users',            'Remove members from the company'),
  ('users.change_role',  'Team',      'Change member roles',     'Assign a different role to a member'),
  ('billing.manage',     'Billing',   'Manage billing',          'View and change subscription/billing'),
  ('company.settings',   'Company',   'Manage company settings', 'Edit company profile and settings'),
  ('company.delete',     'Company',   'Delete company',          'Delete the entire company'),
  ('invoice.create',     'Sales',     'Create invoices',         'Create sales invoices'),
  ('invoice.edit',       'Sales',     'Edit invoices',           'Edit existing sales invoices'),
  ('invoice.delete',     'Sales',     'Delete invoices',         'Delete sales invoices'),
  ('expense.create',     'Purchases', 'Create expenses',         'Create expenses and bills'),
  ('expense.approve',    'Purchases', 'Approve expenses',        'Approve pending expenses'),
  ('reports.view',       'Reports',   'View reports',            'View financial reports'),
  ('inventory.manage',   'Inventory', 'Manage inventory',        'Manage items and stock'),
  ('payroll.manage',     'Payroll',   'Manage payroll',          'Run payroll and manage payslips')
on conflict (key) do nothing;

-- 2. roles (system + custom per-company)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  is_removable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists roles_key_company_uniq
  on public.roles (key, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid));
grant select, insert, update, delete on public.roles to authenticated;
grant all on public.roles to service_role;
alter table public.roles enable row level security;
drop policy if exists "roles readable by members" on public.roles;
create policy "roles readable by members" on public.roles for select to authenticated
  using (company_id is null or public.is_company_member(company_id));
drop policy if exists "roles managed by admins" on public.roles;
create policy "roles managed by admins" on public.roles for all to authenticated
  using (company_id is not null and public.is_company_admin(company_id))
  with check (company_id is not null and public.is_company_admin(company_id));

insert into public.roles (company_id, key, name, description, is_system, is_removable) values
  (null, 'owner',      'Owner',      'Full access, cannot be removed',   true, false),
  (null, 'admin',      'Admin',      'Manage team, billing, all data',   true, false),
  (null, 'accountant', 'Accountant', 'Full accounting access',           true, false),
  (null, 'manager',    'Manager',    'Manage sales, purchases, reports', true, false),
  (null, 'employee',   'Employee',   'Create invoices and expenses',     true, false),
  (null, 'viewer',     'Viewer',     'Read-only access',                 true, false)
on conflict do nothing;

-- 3. role_permissions
create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
grant select, insert, delete on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;
drop policy if exists "role_permissions readable" on public.role_permissions;
create policy "role_permissions readable" on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id
                 and (r.company_id is null or public.is_company_member(r.company_id))));
drop policy if exists "role_permissions managed by admins" on public.role_permissions;
create policy "role_permissions managed by admins" on public.role_permissions for all to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id
                 and r.company_id is not null and public.is_company_admin(r.company_id)))
  with check (exists (select 1 from public.roles r where r.id = role_id
                 and r.company_id is not null and public.is_company_admin(r.company_id)));

do $$
declare
  r_owner uuid; r_admin uuid; r_accountant uuid;
  r_manager uuid; r_employee uuid; r_viewer uuid;
begin
  select id into r_owner      from public.roles where company_id is null and key='owner';
  select id into r_admin      from public.roles where company_id is null and key='admin';
  select id into r_accountant from public.roles where company_id is null and key='accountant';
  select id into r_manager    from public.roles where company_id is null and key='manager';
  select id into r_employee   from public.roles where company_id is null and key='employee';
  select id into r_viewer     from public.roles where company_id is null and key='viewer';

  insert into public.role_permissions (role_id, permission_id)
    select r_owner, id from public.permissions on conflict do nothing;
  insert into public.role_permissions (role_id, permission_id)
    select r_admin, id from public.permissions on conflict do nothing;
  insert into public.role_permissions (role_id, permission_id)
    select r_accountant, id from public.permissions
     where key in ('invoice.create','invoice.edit','invoice.delete',
                   'expense.create','expense.approve','reports.view',
                   'inventory.manage','payroll.manage') on conflict do nothing;
  insert into public.role_permissions (role_id, permission_id)
    select r_manager, id from public.permissions
     where key in ('users.invite','invoice.create','invoice.edit',
                   'expense.create','expense.approve','reports.view','inventory.manage')
     on conflict do nothing;
  insert into public.role_permissions (role_id, permission_id)
    select r_employee, id from public.permissions
     where key in ('invoice.create','expense.create','reports.view')
     on conflict do nothing;
  insert into public.role_permissions (role_id, permission_id)
    select r_viewer, id from public.permissions
     where key in ('reports.view') on conflict do nothing;
end $$;

-- 4. company_members: role_id + 'removed' status + profiles FK
alter table public.company_members add column if not exists role_id uuid references public.roles(id);

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'company_member_status' and e.enumlabel = 'removed'
  ) then
    alter type public.company_member_status add value 'removed';
  end if;
end $$;

update public.company_members m
   set role_id = r.id
  from public.roles r
 where r.company_id is null
   and r.key::text = m.role::text
   and m.role_id is null;
update public.company_members m
   set role_id = (select id from public.roles where company_id is null and key='viewer')
 where m.role_id is null;
alter table public.company_members alter column role_id set not null;

insert into public.profiles (id)
select distinct m.user_id from public.company_members m
left join public.profiles p on p.id = m.user_id where p.id is null
on conflict do nothing;

alter table public.company_members drop constraint if exists company_members_user_id_fkey;
alter table public.company_members
  add constraint company_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_company_members_updated on public.company_members;
create trigger trg_company_members_updated before update on public.company_members
for each row execute function public.set_updated_at();

-- 5. team_invitations
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role_id uuid not null references public.roles(id),
  token uuid not null default gen_random_uuid() unique,
  personal_message text,
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_team_invitations_company on public.team_invitations(company_id);
create index if not exists idx_team_invitations_email on public.team_invitations(lower(email));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'team_invitations_invited_by_fkey') then
    insert into public.profiles (id)
    select distinct invited_by from public.team_invitations on conflict do nothing;
    alter table public.team_invitations
      add constraint team_invitations_invited_by_fkey
      foreign key (invited_by) references public.profiles(id) on delete set null;
  end if;
end $$;

grant select, insert, update, delete on public.team_invitations to authenticated;
grant select on public.team_invitations to anon;
grant all on public.team_invitations to service_role;
alter table public.team_invitations enable row level security;
drop policy if exists "invitations token lookup" on public.team_invitations;
create policy "invitations token lookup" on public.team_invitations for select to anon, authenticated
  using (true);
drop policy if exists "invitations managed by admins" on public.team_invitations;
create policy "invitations managed by admins" on public.team_invitations for all to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

-- 6. Seat usage / limit
create or replace function public.get_company_seat_limit(p_company_id uuid)
returns integer language plpgsql security definer set search_path = public stable as $$
declare v_owner_id uuid; v_plan text;
begin
  if not public.is_company_member(p_company_id) then return null; end if;
  select user_id into v_owner_id from public.company_members
   where company_id = p_company_id
     and role_id = (select id from public.roles where company_id is null and key='owner')
   limit 1;
  if v_owner_id is null then
    select user_id into v_owner_id from public.companies where id = p_company_id;
  end if;
  select plan into v_plan from public.subscriptions where user_id = v_owner_id;
  return case coalesce(v_plan, 'free')
    when 'free' then 3 when 'pro' then 10
    when 'business' then 25 when 'enterprise' then null
    else 3 end;
end $$;

create or replace function public.get_company_seat_usage(p_company_id uuid)
returns integer language sql security definer set search_path = public stable as $$
  select count(*)::int from (
    select 1 from public.company_members
     where company_id = p_company_id and status in ('active','invited','suspended')
    union all
    select 1 from public.team_invitations
     where company_id = p_company_id and status = 'pending'
  ) s
  where public.is_company_member(p_company_id);
$$;

grant execute on function public.get_company_seat_limit(uuid) to authenticated;
grant execute on function public.get_company_seat_usage(uuid) to authenticated;

-- 7. Team RPCs
create or replace function public.change_member_role(p_member_id uuid, p_new_role_id uuid)
returns public.company_members language plpgsql security definer set search_path = public as $$
declare v_row public.company_members; v_owner_key text; v_target_key text;
begin
  select * into v_row from public.company_members where id = p_member_id;
  if v_row is null then raise exception 'MEMBER_NOT_FOUND: Member not found' using errcode='P0001'; end if;
  if not public.is_company_admin(v_row.company_id) then
    raise exception 'FORBIDDEN: Only admins can change roles' using errcode='P0001'; end if;
  select key into v_owner_key from public.roles where id = v_row.role_id;
  if v_owner_key = 'owner' then
    raise exception 'CANNOT_MODIFY_OWNER: The owner role cannot be changed' using errcode='P0001'; end if;
  select key into v_target_key from public.roles where id = p_new_role_id;
  if v_target_key = 'owner' then
    raise exception 'CANNOT_ASSIGN_OWNER: The owner role cannot be assigned' using errcode='P0001'; end if;
  update public.company_members set role_id = p_new_role_id, updated_at = now()
   where id = p_member_id returning * into v_row;
  return v_row;
end $$;

create or replace function public.set_member_status(p_member_id uuid, p_status text)
returns public.company_members language plpgsql security definer set search_path = public as $$
declare v_row public.company_members; v_role_key text;
begin
  select * into v_row from public.company_members where id = p_member_id;
  if v_row is null then raise exception 'MEMBER_NOT_FOUND: Member not found' using errcode='P0001'; end if;
  if not public.is_company_admin(v_row.company_id) then
    raise exception 'FORBIDDEN: Only admins can change member status' using errcode='P0001'; end if;
  select key into v_role_key from public.roles where id = v_row.role_id;
  if v_role_key = 'owner' then
    raise exception 'CANNOT_MODIFY_OWNER: The owner cannot be suspended or removed' using errcode='P0001'; end if;
  if p_status not in ('active','invited','suspended','removed') then
    raise exception 'INVALID_STATUS: Unknown status %', p_status using errcode='P0001'; end if;
  update public.company_members set status = p_status::public.company_member_status, updated_at = now()
   where id = p_member_id returning * into v_row;
  return v_row;
end $$;

create or replace function public.create_team_invitation(
  p_company_id uuid, p_email text, p_role_id uuid, p_personal_message text default null
) returns public.team_invitations language plpgsql security definer set search_path = public as $$
declare v_row public.team_invitations; v_limit int; v_used int; v_role_key text;
begin
  if not public.is_company_admin(p_company_id) then
    raise exception 'FORBIDDEN: Only admins can invite members' using errcode='P0001'; end if;
  select key into v_role_key from public.roles
   where id = p_role_id and (company_id is null or company_id = p_company_id);
  if v_role_key is null then
    raise exception 'INVALID_ROLE: Role does not exist for this company' using errcode='P0001'; end if;
  if v_role_key = 'owner' then
    raise exception 'CANNOT_INVITE_OWNER: The owner role cannot be assigned via invitation' using errcode='P0001'; end if;
  v_limit := public.get_company_seat_limit(p_company_id);
  v_used  := public.get_company_seat_usage(p_company_id);
  if v_limit is not null and v_used >= v_limit then
    raise exception 'SEAT_LIMIT_REACHED: Your plan limit has been reached. Upgrade to add more team members.' using errcode='P0001'; end if;
  update public.team_invitations set status = 'revoked'
   where company_id = p_company_id and lower(email) = lower(p_email) and status = 'pending';
  insert into public.team_invitations (company_id, email, role_id, personal_message, invited_by)
  values (p_company_id, lower(p_email), p_role_id, p_personal_message, auth.uid())
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.resend_team_invitation(p_invitation_id uuid)
returns public.team_invitations language plpgsql security definer set search_path = public as $$
declare v_row public.team_invitations;
begin
  select * into v_row from public.team_invitations where id = p_invitation_id;
  if v_row is null then
    raise exception 'INVITATION_NOT_FOUND: Invitation not found' using errcode='P0001'; end if;
  if not public.is_company_admin(v_row.company_id) then
    raise exception 'FORBIDDEN: Only admins can resend invitations' using errcode='P0001'; end if;
  update public.team_invitations
     set status = 'pending', expires_at = now() + interval '7 days', token = gen_random_uuid()
   where id = p_invitation_id returning * into v_row;
  return v_row;
end $$;

create or replace function public.accept_team_invitation(p_token uuid)
returns public.company_members language plpgsql security definer set search_path = public as $$
declare v_inv public.team_invitations; v_user uuid := auth.uid();
        v_user_email text; v_member public.company_members;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED: You must sign in first' using errcode='P0001'; end if;
  select * into v_inv from public.team_invitations where token = p_token;
  if v_inv is null then
    raise exception 'INVITATION_NOT_FOUND: Invitation not found' using errcode='P0001'; end if;
  if v_inv.status <> 'pending' then
    raise exception 'INVITATION_NOT_PENDING: Invitation is no longer valid' using errcode='P0001'; end if;
  if v_inv.expires_at < now() then
    update public.team_invitations set status='expired' where id = v_inv.id;
    raise exception 'INVITATION_EXPIRED: Invitation has expired' using errcode='P0001'; end if;
  select email into v_user_email from auth.users where id = v_user;
  if lower(coalesce(v_user_email,'')) <> lower(v_inv.email) then
    raise exception 'EMAIL_MISMATCH: You must sign in with %', v_inv.email using errcode='P0001'; end if;
  insert into public.company_members (company_id, user_id, role_id, status, joined_at, invited_by)
  values (v_inv.company_id, v_user, v_inv.role_id, 'active', now(), v_inv.invited_by)
  on conflict (company_id, user_id) do update
    set role_id = excluded.role_id, status = 'active',
        joined_at = coalesce(public.company_members.joined_at, now()), updated_at = now()
  returning * into v_member;
  update public.team_invitations set status='accepted', accepted_at=now() where id = v_inv.id;
  return v_member;
end $$;

grant execute on function public.change_member_role(uuid, uuid) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;
grant execute on function public.create_team_invitation(uuid, text, uuid, text) to authenticated;
grant execute on function public.resend_team_invitation(uuid) to authenticated;
grant execute on function public.accept_team_invitation(uuid) to authenticated;