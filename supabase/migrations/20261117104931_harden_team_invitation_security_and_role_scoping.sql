-- Harden team invitation access and enforce tenant-scoped role assignment.

drop policy if exists "invitations token lookup" on public.team_invitations;
revoke all on table public.team_invitations from public, anon;
grant select, insert, update, delete on table public.team_invitations to authenticated;
grant all on table public.team_invitations to service_role;

create or replace function public.get_public_team_invitation(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select pg_catalog.jsonb_build_object(
    'email', i.email,
    'status', i.status,
    'expires_at', i.expires_at,
    'company', pg_catalog.jsonb_build_object('name', c.name),
    'role', pg_catalog.jsonb_build_object('name', r.name),
    'inviter_name', coalesce(p.full_name, 'A team administrator')
  )
  from public.team_invitations as i
  join public.companies as c on c.id = i.company_id
  join public.roles as r on r.id = i.role_id
  left join public.profiles as p on p.id = i.invited_by
  where i.token = p_token
    and i.status = 'pending'
    and i.expires_at > pg_catalog.now()
  limit 1;
$function$;

revoke all on function public.get_public_team_invitation(uuid) from public, anon;
grant execute on function public.get_public_team_invitation(uuid) to anon, authenticated;

alter table public.team_invitations
  alter column invited_by drop not null;

alter table public.team_invitations
  drop constraint if exists team_invitations_invited_by_fkey;
alter table public.team_invitations
  add constraint team_invitations_invited_by_fkey
  foreign key (invited_by) references public.profiles(id) on delete set null;

create or replace function public.change_member_role(p_member_id uuid, p_new_role_id uuid)
returns public.company_members
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_row public.company_members;
  v_current_role_key text;
  v_target_role_key text;
  v_target_company_id uuid;
begin
  select * into v_row
  from public.company_members
  where id = p_member_id
  for update;

  if not found then
    raise exception 'MEMBER_NOT_FOUND: Member not found' using errcode = 'P0001';
  end if;

  if not public.is_company_admin(v_row.company_id) then
    raise exception 'FORBIDDEN: Only admins can change roles' using errcode = 'P0001';
  end if;

  select key into v_current_role_key
  from public.roles
  where id = v_row.role_id;

  if v_current_role_key = 'owner' then
    raise exception 'CANNOT_MODIFY_OWNER: The owner role cannot be changed' using errcode = 'P0001';
  end if;

  select key, company_id
    into v_target_role_key, v_target_company_id
  from public.roles
  where id = p_new_role_id;

  if not found then
    raise exception 'INVALID_ROLE: Role does not exist' using errcode = 'P0001';
  end if;

  if v_target_company_id is not null and v_target_company_id <> v_row.company_id then
    raise exception 'INVALID_ROLE: Role does not belong to this company' using errcode = 'P0001';
  end if;

  if v_target_role_key = 'owner' then
    raise exception 'CANNOT_ASSIGN_OWNER: The owner role cannot be assigned' using errcode = 'P0001';
  end if;

  update public.company_members
  set role_id = p_new_role_id, updated_at = pg_catalog.now()
  where id = p_member_id
  returning * into v_row;

  return v_row;
end;
$function$;

alter function public.set_member_status(uuid, text) set search_path = pg_catalog;
alter function public.create_team_invitation(uuid, text, uuid, text) set search_path = pg_catalog;
alter function public.resend_team_invitation(uuid) set search_path = pg_catalog;
alter function public.accept_team_invitation(uuid) set search_path = pg_catalog;
alter function public.get_company_seat_limit(uuid) set search_path = pg_catalog;
alter function public.get_company_seat_usage(uuid) set search_path = pg_catalog;

revoke all on function public.change_member_role(uuid, uuid) from public, anon;
revoke all on function public.set_member_status(uuid, text) from public, anon;
revoke all on function public.create_team_invitation(uuid, text, uuid, text) from public, anon;
revoke all on function public.resend_team_invitation(uuid) from public, anon;
revoke all on function public.accept_team_invitation(uuid) from public, anon;
revoke all on function public.get_company_seat_limit(uuid) from public, anon;
revoke all on function public.get_company_seat_usage(uuid) from public, anon;

grant execute on function public.change_member_role(uuid, uuid) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;
grant execute on function public.create_team_invitation(uuid, text, uuid, text) to authenticated;
grant execute on function public.resend_team_invitation(uuid) to authenticated;
grant execute on function public.accept_team_invitation(uuid) to authenticated;
grant execute on function public.get_company_seat_limit(uuid) to authenticated;
grant execute on function public.get_company_seat_usage(uuid) to authenticated;
