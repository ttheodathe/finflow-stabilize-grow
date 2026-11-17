-- Preserve Polar subscription event ordering and make subscription updates atomic.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS polar_last_event_at timestamptz;

-- Seed the ordering watermark from already recorded signed Polar events.
WITH latest AS (
  SELECT payload->'data'->>'id' AS polar_subscription_id,
         max((payload->'data'->>'modifiedAt')::timestamptz) AS last_event_at
  FROM public.billing_events
  WHERE source = 'polar'
    AND event_type LIKE 'subscription.%'
    AND payload->'data'->>'id' IS NOT NULL
    AND payload->'data'->>'modifiedAt' IS NOT NULL
  GROUP BY payload->'data'->>'id'
)
UPDATE public.subscriptions s
SET polar_last_event_at = latest.last_event_at
FROM latest
WHERE s.polar_subscription_id = latest.polar_subscription_id
  AND s.polar_last_event_at IS NULL;

CREATE OR REPLACE FUNCTION public.apply_polar_subscription_event(
  p_user_id uuid,
  p_company_id uuid,
  p_polar_subscription_id text,
  p_polar_customer_id text,
  p_price_id text,
  p_plan text,
  p_billing_cycle text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_modified_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  affected integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_company_id IS NULL
     OR p_polar_subscription_id IS NULL OR length(p_polar_subscription_id) = 0
     OR p_event_modified_at IS NULL THEN
    RAISE EXCEPTION 'invalid_polar_subscription_event' USING ERRCODE = '22023';
  END IF;

  IF p_plan NOT IN ('free', 'pro', 'business', 'enterprise') THEN
    RAISE EXCEPTION 'invalid_subscription_plan' USING ERRCODE = '22023';
  END IF;

  IF p_billing_cycle IS NOT NULL AND p_billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'invalid_billing_cycle' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
      AND cm.status::text = 'active'
      AND cm.role::text IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'polar_subscription_company_membership_invalid'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.subscriptions AS current_sub (
    user_id, owner_id, company_id, polar_subscription_id,
    polar_customer_id, price_id, plan, billing_cycle, status,
    current_period_start, current_period_end, cancel_at_period_end,
    polar_last_event_at, updated_at
  )
  VALUES (
    p_user_id, p_user_id, p_company_id, p_polar_subscription_id,
    p_polar_customer_id, p_price_id, p_plan, p_billing_cycle, p_status,
    p_current_period_start, p_current_period_end, COALESCE(p_cancel_at_period_end, false),
    p_event_modified_at, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    company_id = EXCLUDED.company_id,
    polar_subscription_id = EXCLUDED.polar_subscription_id,
    polar_customer_id = EXCLUDED.polar_customer_id,
    price_id = EXCLUDED.price_id,
    plan = EXCLUDED.plan,
    billing_cycle = EXCLUDED.billing_cycle,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    polar_last_event_at = EXCLUDED.polar_last_event_at,
    updated_at = now()
  WHERE current_sub.polar_last_event_at IS NULL
     OR EXCLUDED.polar_last_event_at >= current_sub.polar_last_event_at;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_polar_subscription_event(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, boolean, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_polar_subscription_event(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, boolean, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.apply_polar_subscription_event(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, boolean, timestamptz
) IS 'Applies only the newest verified Polar subscription event for an authorized company owner/admin; service-role only.';
