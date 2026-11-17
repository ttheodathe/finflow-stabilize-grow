-- Stage A.6: serialize invitation acceptance and enforce bank-transfer tenant integrity.

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.organization_invitations%ROWTYPE;
  v_org_deleted_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  SELECT oi.* INTO v_inv FROM public.organization_invitations oi WHERE oi.token = _token FOR UPDATE;
  IF NOT FOUND OR v_inv.status <> 'pending' OR v_inv.expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'Invitation not found, already used, or expired';
  END IF;
  IF pg_catalog.lower(v_inv.email) <> pg_catalog.lower(COALESCE(v_email, '')) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;
  IF v_inv.role = 'owner'::public.org_member_role THEN
    RAISE EXCEPTION 'Owner role cannot be granted through an invitation';
  END IF;
  SELECT o.deleted_at INTO v_org_deleted_at FROM public.organizations o WHERE o.id = v_inv.organization_id;
  IF NOT FOUND OR v_org_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Organization is unavailable'; END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, status, invited_by, joined_at)
  VALUES (v_inv.organization_id, v_uid, v_inv.role, 'active', v_inv.invited_by, pg_catalog.now())
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'active',
        joined_at = COALESCE(public.organization_members.joined_at, pg_catalog.now());
  UPDATE public.organization_invitations SET status = 'accepted', accepted_at = pg_catalog.now()
   WHERE id = v_inv.id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation was already accepted'; END IF;
  RETURN v_inv.organization_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token uuid)
RETURNS public.company_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_inv public.team_invitations%ROWTYPE;
  v_user uuid := auth.uid();
  v_user_email text;
  v_member public.company_members;
  v_role_key text;
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
  INSERT INTO public.company_members (company_id, user_id, role_id, status, joined_at, invited_by)
  VALUES (v_inv.company_id, v_user, v_inv.role_id, 'active', pg_catalog.now(), v_inv.invited_by)
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET role_id = CASE
          WHEN EXISTS (SELECT 1 FROM public.roles existing_role
                        WHERE existing_role.id = public.company_members.role_id
                          AND existing_role.key = 'owner')
          THEN public.company_members.role_id ELSE EXCLUDED.role_id END,
        status = 'active',
        joined_at = COALESCE(public.company_members.joined_at, pg_catalog.now()),
        updated_at = pg_catalog.now()
  RETURNING * INTO v_member;
  UPDATE public.team_invitations SET status = 'accepted', accepted_at = pg_catalog.now()
   WHERE id = v_inv.id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITATION_NOT_PENDING: Invitation was already accepted' USING errcode = 'P0001'; END IF;
  RETURN v_member;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_team_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_bank_transfer(
  _from_account_id uuid, _to_account_id uuid, _amount numeric,
  _transfer_date date DEFAULT CURRENT_DATE, _notes text DEFAULT NULL
)
RETURNS public.bank_transfers LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_from public.bank_accounts%ROWTYPE;
  v_to public.bank_accounts%ROWTYPE;
  v_transfer public.bank_transfers;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _from_account_id IS NULL OR _to_account_id IS NULL OR _from_account_id = _to_account_id THEN
    RAISE EXCEPTION 'Choose two different valid accounts';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _transfer_date IS NULL THEN RAISE EXCEPTION 'Transfer date is required'; END IF;
  PERFORM ba.id FROM public.bank_accounts ba
   WHERE ba.id IN (_from_account_id, _to_account_id) ORDER BY ba.id FOR UPDATE;
  SELECT ba.* INTO v_from FROM public.bank_accounts ba WHERE ba.id = _from_account_id;
  IF NOT FOUND OR NOT v_from.is_active THEN RAISE EXCEPTION 'Source account not found or inactive'; END IF;
  SELECT ba.* INTO v_to FROM public.bank_accounts ba WHERE ba.id = _to_account_id;
  IF NOT FOUND OR NOT v_to.is_active THEN RAISE EXCEPTION 'Destination account not found or inactive'; END IF;
  IF v_from.company_id IS NULL OR v_from.company_id <> v_to.company_id THEN
    RAISE EXCEPTION 'Both accounts must belong to the same company';
  END IF;
  IF v_from.currency IS DISTINCT FROM v_to.currency THEN
    RAISE EXCEPTION 'Transfers between different currencies are not supported';
  END IF;
  IF NOT public.is_company_member(v_from.company_id)
     OR public.get_company_role(v_from.company_id) = 'viewer'::public.company_member_role THEN
    RAISE EXCEPTION 'Not permitted to transfer funds for this company';
  END IF;
  INSERT INTO public.bank_transfers
    (user_id, company_id, from_account_id, to_account_id, amount, transfer_date, notes)
  VALUES (v_uid, v_from.company_id, _from_account_id, _to_account_id, _amount, _transfer_date, _notes)
  RETURNING * INTO v_transfer;
  INSERT INTO public.bank_transactions
    (user_id, company_id, bank_account_id, txn_date, description, amount, is_transfer, bank_transfer_id)
  VALUES
    (v_uid, v_from.company_id, _from_account_id, _transfer_date, 'Transfer to ' || v_to.name, -_amount, true, v_transfer.id),
    (v_uid, v_from.company_id, _to_account_id, _transfer_date, 'Transfer from ' || v_from.name, _amount, true, v_transfer.id);
  RETURN v_transfer;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_bank_transfer(uuid, uuid, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bank_transfer(uuid, uuid, numeric, date, text) TO authenticated;
