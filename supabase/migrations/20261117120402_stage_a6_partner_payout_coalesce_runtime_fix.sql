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

  UPDATE public.partner_commissions
     SET status = 'paid',
         updated_at = pg_catalog.now()
   WHERE id = ANY(p_commission_ids)
     AND partner_id = p_partner_id
     AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commission state changed while creating payout';
  END IF;

  RETURN v_payout;
END;
$function$;
