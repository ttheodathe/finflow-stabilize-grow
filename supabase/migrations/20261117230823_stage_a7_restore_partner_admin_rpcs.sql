-- Restore the two staff-only partner administration RPCs used by the live app.
-- The older partner payout migration containing these functions was superseded
-- and archived; these implementations retain explicit auth and value guards.

CREATE OR REPLACE FUNCTION public.set_partner_status(
  p_partner_id uuid,
  p_status public.partner_status
)
RETURNS public.partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.partners;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_partner_id IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'partner and status are required';
  END IF;

  UPDATE public.partners
     SET status = p_status,
         updated_at = pg_catalog.now()
   WHERE id = p_partner_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner not found';
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_partner_program_settings(
  p_multi_tier_enabled boolean,
  p_max_tiers smallint,
  p_tier2_rate numeric,
  p_tier3_rate numeric
)
RETURNS public.partner_program_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.partner_program_settings;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_multi_tier_enabled IS NULL
     OR p_max_tiers IS NULL OR p_max_tiers < 1 OR p_max_tiers > 3
     OR p_tier2_rate IS NULL OR p_tier2_rate < 0 OR p_tier2_rate > 100
     OR p_tier3_rate IS NULL OR p_tier3_rate < 0 OR p_tier3_rate > 100 THEN
    RAISE EXCEPTION 'invalid partner program settings';
  END IF;

  UPDATE public.partner_program_settings
     SET multi_tier_enabled = p_multi_tier_enabled,
         max_tiers = p_max_tiers,
         tier2_rate = p_tier2_rate,
         tier3_rate = p_tier3_rate,
         updated_at = pg_catalog.now(),
         updated_by = auth.uid()
   WHERE id = true
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner program settings row not found';
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_partner_status(uuid, public.partner_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_partner_status(uuid, public.partner_status) TO authenticated;

REVOKE ALL ON FUNCTION public.update_partner_program_settings(boolean, smallint, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_partner_program_settings(boolean, smallint, numeric, numeric) TO authenticated;
