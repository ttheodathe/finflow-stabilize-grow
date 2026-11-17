-- Prevent authenticated clients from bypassing membership-management RPC safeguards.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.company_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.company_members TO authenticated;

CREATE OR REPLACE FUNCTION public.set_member_status(p_member_id uuid, p_status text)
RETURNS public.company_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_row public.company_members;
  v_role_key text;
BEGIN
  SELECT cm.* INTO v_row
    FROM public.company_members cm
   WHERE cm.id = p_member_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND: Member not found' USING errcode = 'P0001';
  END IF;
  IF NOT public.is_company_admin(v_row.company_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Only admins can change member status' USING errcode = 'P0001';
  END IF;
  SELECT r.key INTO v_role_key FROM public.roles r WHERE r.id = v_row.role_id;
  IF v_role_key = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_MODIFY_OWNER: The owner cannot be suspended or removed' USING errcode = 'P0001';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('active','invited','suspended','removed') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Unknown status %', p_status USING errcode = 'P0001';
  END IF;
  UPDATE public.company_members
     SET status = p_status::public.company_member_status,
         updated_at = pg_catalog.now()
   WHERE id = v_row.id
   RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_member_status(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_status(uuid,text) TO authenticated;
