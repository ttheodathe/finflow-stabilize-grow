-- Return only fields required by the public invitation landing page.
-- Do not return the bearer token, internal IDs, or personal message.

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
