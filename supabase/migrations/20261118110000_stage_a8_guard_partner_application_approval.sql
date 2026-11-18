-- Stage A.8: make partner approval a guarded, one-way state transition.
-- Public submission remains available; this only hardens the staff approval RPC.

CREATE OR REPLACE FUNCTION public.approve_partner_application(
  p_application_id uuid,
  p_commission_rate numeric DEFAULT 20.00
)
RETURNS public.partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_app public.partner_applications;
  v_partner public.partners;
  v_code text;
  v_commission_rate numeric := COALESCE(p_commission_rate, 20.00);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_commission_rate < 0 OR v_commission_rate > 100 THEN
    RAISE EXCEPTION 'commission rate must be between 0 and 100';
  END IF;

  SELECT *
    INTO v_app
    FROM public.partner_applications
   WHERE id = p_application_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'only pending partner applications can be approved';
  END IF;

  IF v_app.user_id IS NULL THEN
    RAISE EXCEPTION 'application has no linked account yet; ask the applicant to sign up before approving';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.partners
     WHERE application_id = v_app.id
        OR user_id = v_app.user_id
  ) THEN
    RAISE EXCEPTION 'applicant already has a partner record';
  END IF;

  v_code := public.generate_partner_referral_code(v_app.business_name);

  INSERT INTO public.partners (
    user_id, application_id, partner_type, business_name, referral_code,
    commission_rate, created_by
  ) VALUES (
    v_app.user_id, v_app.id, v_app.partner_type, v_app.business_name, v_code,
    v_commission_rate, auth.uid()
  )
  RETURNING * INTO v_partner;

  UPDATE public.partner_applications
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   WHERE id = p_application_id
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application state changed before approval completed';
  END IF;

  RETURN v_partner;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_partner_application(uuid, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_partner_application(uuid, numeric)
  TO authenticated, service_role;
