-- Resolve paid feature entitlements consistently for company and owner-level subscriptions.
-- The existing feature trigger is used by purchase orders, credit notes,
-- recurring invoices and payroll. It previously ignored company_id and
-- owner_id subscription rows and did not normalize historical plan aliases.

CREATE OR REPLACE FUNCTION public.company_has_feature(p_company_id uuid, p_feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_owner_id uuid;
  v_plan text;
  v_status text;
  v_plan_key text;
  v_allowed boolean := false;
BEGIN
  IF p_company_id IS NULL OR NULLIF(pg_catalog.btrim(p_feature), '') IS NULL THEN
    RETURN false;
  END IF;

  SELECT c.user_id INTO v_owner_id
    FROM public.companies c
   WHERE c.id = p_company_id;

  IF NOT FOUND OR v_owner_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT s.plan, s.status INTO v_plan, v_status
    FROM public.subscriptions s
   WHERE s.company_id = p_company_id
   ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
   LIMIT 1;

  IF NOT FOUND THEN
    SELECT s.plan, s.status INTO v_plan, v_status
      FROM public.subscriptions s
     WHERE s.company_id IS NULL
       AND (s.user_id = v_owner_id OR s.owner_id = v_owner_id)
     ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
     LIMIT 1;
  END IF;

  IF v_status IS DISTINCT FROM 'active'
     AND v_status IS DISTINCT FROM 'trialing' THEN
    v_plan_key := 'free';
  ELSE
    v_plan_key := CASE pg_catalog.lower(pg_catalog.btrim(COALESCE(v_plan, 'free')))
      WHEN 'professional' THEN 'pro'
      WHEN 'starter' THEN 'pro'
      WHEN 'growth' THEN 'business'
      WHEN 'team' THEN 'business'
      WHEN 'custom' THEN 'enterprise'
      WHEN 'basic' THEN 'free'
      WHEN 'trial' THEN 'free'
      ELSE pg_catalog.lower(pg_catalog.btrim(COALESCE(v_plan, 'free')))
    END;
  END IF;

  SELECT COALESCE((sp.features ->> p_feature)::boolean, false)
    INTO v_allowed
    FROM public.subscription_plans sp
   WHERE sp.key = v_plan_key
     AND sp.is_active;

  RETURN COALESCE(v_allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.company_has_feature(uuid, text)
  FROM PUBLIC, anon, authenticated;

-- Centralize INSERT-time paid-feature enforcement through the same resolver.
CREATE OR REPLACE FUNCTION public.enforce_plan_feature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_feature text := TG_ARGV[0];
BEGIN
  IF NOT public.company_has_feature(NEW.company_id, v_feature) THEN
    RAISE EXCEPTION 'feature_locked: % requires an active eligible plan', v_feature
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_plan_feature()
  FROM PUBLIC, anon, authenticated;

-- HR is Business/Enterprise-only in the application feature catalog.
UPDATE public.subscription_plans
   SET features = pg_catalog.jsonb_set(COALESCE(features, '{}'::jsonb), '{hr}', 'false'::jsonb, true)
 WHERE key IN ('free', 'pro');

UPDATE public.subscription_plans
   SET features = pg_catalog.jsonb_set(COALESCE(features, '{}'::jsonb), '{hr}', 'true'::jsonb, true)
 WHERE key IN ('business', 'enterprise');

-- Prevent direct PostgREST writes from bypassing the Business-only HR module.
DROP TRIGGER IF EXISTS trg_enforce_employees_feature ON public.employees;
CREATE TRIGGER trg_enforce_employees_feature
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('hr');

DROP TRIGGER IF EXISTS trg_enforce_departments_feature ON public.departments;
CREATE TRIGGER trg_enforce_departments_feature
BEFORE INSERT OR UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('hr');

DROP TRIGGER IF EXISTS trg_enforce_leave_requests_feature ON public.leave_requests;
CREATE TRIGGER trg_enforce_leave_requests_feature
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('hr');

DROP TRIGGER IF EXISTS trg_enforce_leave_types_feature ON public.leave_types;
CREATE TRIGGER trg_enforce_leave_types_feature
BEFORE INSERT OR UPDATE ON public.leave_types
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('hr');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_enforce_pay_runs_feature'
       AND tgrelid = 'public.pay_runs'::regclass
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Existing payroll plan trigger is missing';
  END IF;
  PERFORM public.company_has_feature(
    (SELECT c.id FROM public.companies c ORDER BY c.created_at LIMIT 1),
    'payroll'
  );
END;
$$;
