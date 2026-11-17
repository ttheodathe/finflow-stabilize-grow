CREATE OR REPLACE FUNCTION public.create_partner_payout(
  p_partner_id uuid,
  p_commission_ids uuid[],
  p_method text DEFAULT NULL::text,
  p_reference text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text
)
RETURNS public.partner_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_payout public.partner_payouts;
  v_total numeric(12,2);
  v_currency text;
  v_count integer;
  v_currency_count integer;
  v_distinct_ids integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_partner_id IS NULL
     OR p_commission_ids IS NULL
     OR pg_catalog.cardinality(p_commission_ids) = 0
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(p_commission_ids) AS ids(id)
       WHERE ids.id IS NULL
     ) THEN
    RAISE EXCEPTION 'partner and at least one valid commission are required';
  END IF;

  SELECT count(DISTINCT ids.id)
    INTO v_distinct_ids
    FROM pg_catalog.unnest(p_commission_ids) AS ids(id);

  IF v_distinct_ids <> pg_catalog.cardinality(p_commission_ids) THEN
    RAISE EXCEPTION 'duplicate commission IDs are not allowed';
  END IF;

  PERFORM c.id
    FROM public.partner_commissions c
   WHERE c.id = ANY(p_commission_ids)
   ORDER BY c.id
   FOR UPDATE;

  SELECT
    COALESCE(pg_catalog.sum(c.commission_amount), 0),
    pg_catalog.min(c.currency),
    pg_catalog.count(*),
    pg_catalog.count(DISTINCT c.currency)
  INTO v_total, v_currency, v_count, v_currency_count
  FROM public.partner_commissions c
  WHERE c.id = ANY(p_commission_ids)
    AND c.partner_id = p_partner_id
    AND c.status = 'approved';

  IF v_count <> pg_catalog.cardinality(p_commission_ids) THEN
    RAISE EXCEPTION 'one or more commissions are not approved or do not belong to this partner';
  END IF;

  IF v_currency_count <> 1 OR v_currency IS NULL THEN
    RAISE EXCEPTION 'all commissions in a payout must use the same currency';
  END IF;

  INSERT INTO public.partner_payouts
    (partner_id, total_amount, currency, method, reference, notes, created_by, status)
  VALUES
    (p_partner_id, v_total, v_currency, p_method, p_reference, p_notes, auth.uid(), 'pending')
  RETURNING * INTO v_payout;

  INSERT INTO public.partner_payout_commissions (payout_id, commission_id)
  SELECT v_payout.id, ids.id
  FROM pg_catalog.unnest(p_commission_ids) AS ids(id);

  RETURN v_payout;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_partner_payout_paid(p_payout_id uuid)
RETURNS public.partner_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_row public.partner_payouts;
  v_linked_count integer;
  v_approved_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT *
    INTO v_row
    FROM public.partner_payouts
   WHERE id = p_payout_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'payout is not pending and cannot be marked paid again';
  END IF;

  PERFORM c.id
    FROM public.partner_payout_commissions pc
    JOIN public.partner_commissions c ON c.id = pc.commission_id
   WHERE pc.payout_id = p_payout_id
   ORDER BY c.id
   FOR UPDATE OF c;

  SELECT pg_catalog.count(*),
         pg_catalog.count(*) FILTER (WHERE c.status = 'approved')
    INTO v_linked_count, v_approved_count
    FROM public.partner_payout_commissions pc
    JOIN public.partner_commissions c ON c.id = pc.commission_id
   WHERE pc.payout_id = p_payout_id;

  IF v_linked_count = 0 OR v_linked_count <> v_approved_count THEN
    RAISE EXCEPTION 'payout commissions are missing or are no longer approved';
  END IF;

  UPDATE public.partner_commissions c
     SET status = 'paid',
         updated_at = pg_catalog.now()
    FROM public.partner_payout_commissions pc
   WHERE pc.payout_id = p_payout_id
     AND pc.commission_id = c.id
     AND c.status = 'approved';

  UPDATE public.partner_payouts
     SET status = 'paid',
         paid_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   WHERE id = p_payout_id
     AND status = 'pending'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout state changed before completion';
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_partner_commission(
  p_commission_id uuid,
  p_status public.partner_commission_status,
  p_notes text DEFAULT NULL::text
)
RETURNS public.partner_commissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_row public.partner_commissions;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'cancelled', 'reversed') THEN
    RAISE EXCEPTION 'invalid review status: %', p_status;
  END IF;

  SELECT *
    INTO v_row
    FROM public.partner_commissions
   WHERE id = p_commission_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commission not found';
  END IF;

  IF v_row.status = 'paid' THEN
    RAISE EXCEPTION 'paid commissions cannot be changed by review';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.partner_payout_commissions pc
      JOIN public.partner_payouts pp ON pp.id = pc.payout_id
     WHERE pc.commission_id = p_commission_id
       AND pp.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'commission is reserved by a pending payout';
  END IF;

  UPDATE public.partner_commissions
     SET status = p_status,
         notes = COALESCE(p_notes, notes),
         reviewed_by = auth.uid(),
         reviewed_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   WHERE id = p_commission_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
