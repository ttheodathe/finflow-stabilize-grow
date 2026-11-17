-- Correct default-company fallback ordering to use each user's earliest active membership.
CREATE OR REPLACE FUNCTION public.get_default_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $function$
  SELECT COALESCE(
    (SELECT pref.company_id
       FROM public.user_company_preferences pref
       JOIN public.company_members cm ON cm.company_id=pref.company_id
         AND cm.user_id=pref.user_id AND cm.status='active'
      WHERE pref.user_id=auth.uid()
      LIMIT 1),
    (SELECT cm.company_id
       FROM public.company_members cm
      WHERE cm.user_id=auth.uid() AND cm.status='active'
      ORDER BY cm.joined_at ASC NULLS LAST,cm.created_at ASC,cm.company_id ASC
      LIMIT 1)
  );
$function$;
REVOKE ALL ON FUNCTION public.get_default_company_id() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_default_company_id() TO authenticated;
