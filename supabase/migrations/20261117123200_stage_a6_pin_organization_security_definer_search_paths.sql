-- Pin search_path on organization SECURITY DEFINER helpers.
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = _org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'::public.org_member_status
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = _org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'::public.org_member_status
      AND m.role IN ('owner'::public.org_member_role, 'admin'::public.org_member_role)
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_mate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m1
    JOIN public.organization_members m2
      ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid()
      AND m1.status = 'active'::public.org_member_status
      AND m2.user_id = _user_id
      AND m2.status = 'active'::public.org_member_status
  );
$function$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_mate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_mate(uuid) TO authenticated;
