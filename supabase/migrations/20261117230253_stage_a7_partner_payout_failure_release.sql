-- Release commission reservations when a partner payout fails, while
-- preserving the current validated payout creation and settlement RPCs.

ALTER TABLE public.partner_payout_commissions
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

UPDATE public.partner_payout_commissions pc
   SET released_at = COALESCE(pp.updated_at, pp.created_at, pg_catalog.now())
  FROM public.partner_payouts pp
 WHERE pp.id = pc.payout_id
   AND pp.status = 'failed'
   AND pc.released_at IS NULL;

ALTER TABLE public.partner_payout_commissions
  DROP CONSTRAINT IF EXISTS partner_payout_commissions_commission_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS partner_payout_commissions_active_commission_uidx
  ON public.partner_payout_commissions (commission_id)
  WHERE released_at IS NULL;

DO $$
DECLARE
  v_definition text;
  v_old text := 'WHERE pc.payout_id = p_payout_id';
  v_new text := 'WHERE pc.payout_id = p_payout_id AND pc.released_at IS NULL';
BEGIN
  v_definition := pg_get_functiondef('public.mark_partner_payout_paid(uuid)'::regprocedure);
  IF position(v_new IN v_definition) = 0 THEN
    IF position(v_old IN v_definition) = 0 THEN
      RAISE EXCEPTION 'mark_partner_payout_paid reservation query did not match expected source';
    END IF;
    v_definition := replace(v_definition, v_old, v_new);
    EXECUTE v_definition;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_partner_payout_failed(
  p_payout_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.partner_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.partner_payouts;
  v_linked_count integer;
  v_approved_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
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
    RAISE EXCEPTION 'only pending payouts can be marked failed';
  END IF;

  PERFORM c.id
    FROM public.partner_payout_commissions pc
    JOIN public.partner_commissions c ON c.id = pc.commission_id
   WHERE pc.payout_id = p_payout_id
     AND pc.released_at IS NULL
   ORDER BY c.id
   FOR UPDATE OF c;

  SELECT pg_catalog.count(*),
         pg_catalog.count(*) FILTER (WHERE c.status = 'approved')
    INTO v_linked_count, v_approved_count
    FROM public.partner_payout_commissions pc
    JOIN public.partner_commissions c ON c.id = pc.commission_id
   WHERE pc.payout_id = p_payout_id
     AND pc.released_at IS NULL;

  IF v_linked_count = 0 OR v_linked_count <> v_approved_count THEN
    RAISE EXCEPTION 'payout commissions are missing or are no longer approved';
  END IF;

  UPDATE public.partner_payouts
     SET status = 'failed',
         notes = COALESCE(NULLIF(pg_catalog.btrim(p_notes), ''), notes),
         updated_at = pg_catalog.now()
   WHERE id = p_payout_id
     AND status = 'pending'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout state changed before failure could be recorded';
  END IF;

  UPDATE public.partner_payout_commissions
     SET released_at = pg_catalog.now()
   WHERE payout_id = p_payout_id
     AND released_at IS NULL;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_partner_payout_failed(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_partner_payout_failed(uuid, text) TO authenticated;
