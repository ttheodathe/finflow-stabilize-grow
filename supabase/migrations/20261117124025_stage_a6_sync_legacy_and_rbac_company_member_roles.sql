-- Stage A.6: keep the legacy authorization role in sync with RBAC role_id.
-- Security helpers and company policies still read company_members.role, while
-- team UI/permission checks use role_id. Both columns must change atomically.
CREATE OR REPLACE FUNCTION public.change_member_role(p_member_id uuid, p_new_role_id uuid)
RETURNS public.company_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_row public.company_members;
  v_current_role_key text;
  v_target_role_key text;
  v_target_company_id uuid;
  v_legacy_role public.company_member_role;
BEGIN
  SELECT * INTO v_row FROM public.company_members WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND: Member not found' USING errcode = 'P0001'; END IF;
  IF NOT public.is_company_admin(v_row.company_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Only admins can change roles' USING errcode = 'P0001';
  END IF;
  SELECT r.key INTO v_current_role_key FROM public.roles r WHERE r.id = v_row.role_id;
  IF v_current_role_key = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_MODIFY_OWNER: The owner role cannot be changed' USING errcode = 'P0001';
  END IF;
  SELECT r.key, r.company_id INTO v_target_role_key, v_target_company_id
    FROM public.roles r WHERE r.id = p_new_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ROLE: Role does not exist' USING errcode = 'P0001'; END IF;
  IF v_target_company_id IS NOT NULL AND v_target_company_id <> v_row.company_id THEN
    RAISE EXCEPTION 'INVALID_ROLE: Role does not belong to this company' USING errcode = 'P0001';
  END IF;
  IF v_target_role_key = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_ASSIGN_OWNER: The owner role cannot be assigned' USING errcode = 'P0001';
  END IF;
  -- Privileged legacy enum values are assigned only for recognized system roles.
  -- Manager, employee and custom roles map to viewer in the legacy column.
  v_legacy_role := CASE v_target_role_key
    WHEN 'admin' THEN 'admin'::public.company_member_role
    WHEN 'accountant' THEN 'accountant'::public.company_member_role
    WHEN 'sales' THEN 'sales'::public.company_member_role
    WHEN 'payroll' THEN 'payroll'::public.company_member_role
    WHEN 'hr' THEN 'hr'::public.company_member_role
    WHEN 'inventory' THEN 'inventory'::public.company_member_role
    ELSE 'viewer'::public.company_member_role
  END;
  UPDATE public.company_members
     SET role_id = p_new_role_id, role = v_legacy_role, updated_at = pg_catalog.now()
   WHERE id = p_member_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token uuid)
RETURNS public.company_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_inv public.team_invitations%ROWTYPE;
  v_user uuid := auth.uid();
  v_user_email text;
  v_member public.company_members;
  v_role_key text;
  v_legacy_role public.company_member_role;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED: You must sign in first' USING errcode = 'P0001'; END IF;
  SELECT ti.* INTO v_inv FROM public.team_invitations ti WHERE ti.token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITATION_NOT_FOUND: Invitation not found' USING errcode = 'P0001'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'INVITATION_NOT_PENDING: Invitation is no longer valid' USING errcode = 'P0001'; END IF;
  IF v_inv.expires_at <= pg_catalog.now() THEN RAISE EXCEPTION 'INVITATION_EXPIRED: Invitation has expired' USING errcode = 'P0001'; END IF;
  SELECT u.email INTO v_user_email FROM auth.users u WHERE u.id = v_user;
  IF pg_catalog.lower(COALESCE(v_user_email, '')) <> pg_catalog.lower(v_inv.email) THEN
    RAISE EXCEPTION 'EMAIL_MISMATCH: You must sign in with %', v_inv.email USING errcode = 'P0001';
  END IF;
  SELECT r.key INTO v_role_key FROM public.roles r
   WHERE r.id = v_inv.role_id AND (r.company_id IS NULL OR r.company_id = v_inv.company_id);
  IF v_role_key IS NULL OR v_role_key = 'owner' THEN
    RAISE EXCEPTION 'INVALID_ROLE: Invitation role is not valid for this company' USING errcode = 'P0001';
  END IF;
  v_legacy_role := CASE v_role_key
    WHEN 'admin' THEN 'admin'::public.company_member_role
    WHEN 'accountant' THEN 'accountant'::public.company_member_role
    WHEN 'sales' THEN 'sales'::public.company_member_role
    WHEN 'payroll' THEN 'payroll'::public.company_member_role
    WHEN 'hr' THEN 'hr'::public.company_member_role
    WHEN 'inventory' THEN 'inventory'::public.company_member_role
    ELSE 'viewer'::public.company_member_role
  END;
  INSERT INTO public.company_members (company_id,user_id,role,role_id,status,joined_at,invited_by)
  VALUES (v_inv.company_id,v_user,v_legacy_role,v_inv.role_id,'active',pg_catalog.now(),v_inv.invited_by)
  ON CONFLICT (company_id,user_id) DO UPDATE
    SET role = CASE WHEN EXISTS (
          SELECT 1 FROM public.roles er
           WHERE er.id=public.company_members.role_id AND er.key='owner'
        ) THEN public.company_members.role ELSE EXCLUDED.role END,
        role_id = CASE WHEN EXISTS (
          SELECT 1 FROM public.roles er
           WHERE er.id=public.company_members.role_id AND er.key='owner'
        ) THEN public.company_members.role_id ELSE EXCLUDED.role_id END,
        status='active',
        joined_at=COALESCE(public.company_members.joined_at,pg_catalog.now()),
        updated_at=pg_catalog.now()
  RETURNING * INTO v_member;
  UPDATE public.team_invitations SET status='accepted',accepted_at=pg_catalog.now()
   WHERE id=v_inv.id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITATION_NOT_PENDING: Invitation was already accepted' USING errcode = 'P0001'; END IF;
  RETURN v_member;
END;
$function$;

REVOKE ALL ON FUNCTION public.change_member_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_member_role(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_team_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid) TO authenticated;
