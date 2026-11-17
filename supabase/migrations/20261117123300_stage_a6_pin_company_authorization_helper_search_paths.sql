-- Pin search_path on company authorization SECURITY DEFINER helpers.
CREATE OR REPLACE FUNCTION public.get_company_role(p_company_id uuid)
RETURNS public.company_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT cm.role
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'::public.company_member_status
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'::public.company_member_status
      AND cm.role IN ('owner'::public.company_member_role, 'admin'::public.company_member_role)
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'::public.company_member_status
  );
$function$;

REVOKE ALL ON FUNCTION public.get_company_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
