
create or replace function public.invite_company_member(
  p_company_id uuid,
  p_email text,
  p_role public.company_member_role default 'viewer'
)
returns public.company_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_plan record;
  v_current_users int;
  v_pending_invites int;
  v_invite public.company_invitations;
begin
  if not public.is_company_admin(p_company_id) then
    raise exception 'Only owners or admins can invite members';
  end if;

  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'A valid email is required';
  end if;

  select user_id into v_owner_id
  from public.company_members
  where company_id = p_company_id and role = 'owner'
  limit 1;

  select sp.max_users into v_plan
  from public.subscriptions s
  join public.subscription_plans sp on sp.id = s.plan_id
  where s.user_id = v_owner_id
  limit 1;

  if v_plan is null then
    select max_users into v_plan from public.subscription_plans where key = 'free';
  end if;

  select count(*) into v_current_users
  from public.company_members
  where company_id = p_company_id and status = 'active';

  select count(*) into v_pending_invites
  from public.company_invitations
  where company_id = p_company_id and status = 'pending';

  if (v_current_users + v_pending_invites) >= v_plan.max_users then
    raise exception 'user_limit_reached: your plan allows up to % users per company', v_plan.max_users
      using errcode = 'P0001';
  end if;

  insert into public.company_invitations (company_id, email, role, invited_by)
  values (p_company_id, lower(trim(p_email)), p_role, auth.uid())
  returning * into v_invite;

  insert into public.audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
  values (p_company_id, auth.uid(), 'member.invited', 'company_invitation', v_invite.id,
    jsonb_build_object('email', v_invite.email, 'role', v_invite.role));

  return v_invite;
end;
$$;

create or replace function public.accept_company_invitation(p_token uuid)
returns public.company_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.company_invitations;
  v_member public.company_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite from public.company_invitations
  where token = p_token and status = 'pending' and expires_at > now();

  if v_invite is null then
    raise exception 'Invitation not found or expired';
  end if;

  insert into public.company_members (company_id, user_id, role, status, invited_by, joined_at)
  values (v_invite.company_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by, now())
  on conflict (company_id, user_id) do update set status = 'active', role = excluded.role, joined_at = now()
  returning * into v_member;

  update public.company_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invite.id;

  insert into public.audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
  values (v_invite.company_id, auth.uid(), 'member.joined', 'company_member', v_member.id,
    jsonb_build_object('role', v_member.role));

  return v_member;
end;
$$;

grant execute on function public.invite_company_member(uuid,text,public.company_member_role) to authenticated;
grant execute on function public.accept_company_invitation(uuid) to authenticated;
