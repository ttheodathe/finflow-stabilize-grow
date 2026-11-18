-- Regression tests for the guarded partner approval RPC.
\set ON_ERROR_STOP on

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
SELECT set_config('test.is_platform_staff', 'true', false);

INSERT INTO public.partner_applications (id, user_id, partner_type, business_name)
VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'referral', 'Valid applicant'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'referral', 'Invalid rate applicant'),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'referral', 'Nonstaff applicant');

DO $$
DECLARE
  v_partner public.partners;
BEGIN
  v_partner := public.approve_partner_application(
    '20000000-0000-0000-0000-000000000001', 25
  );
  IF v_partner.commission_rate <> 25 THEN
    RAISE EXCEPTION 'valid commission rate was not persisted';
  END IF;
  IF (SELECT status FROM public.partner_applications
      WHERE id = '20000000-0000-0000-0000-000000000001') <> 'approved' THEN
    RAISE EXCEPTION 'application was not marked approved';
  END IF;
  IF (SELECT count(*) FROM public.partners
      WHERE application_id = '20000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'expected exactly one partner record';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.approve_partner_application(
      '20000000-0000-0000-0000-000000000001', 25
    );
    RAISE EXCEPTION 'expected repeat approval to fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected repeat approval to fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'only pending partner applications%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.approve_partner_application(
      '20000000-0000-0000-0000-000000000002', 101
    );
    RAISE EXCEPTION 'expected out-of-range commission rate to fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected out-of-range commission rate to fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'commission rate must be between 0 and 100%' THEN RAISE; END IF;
  END;

  IF (SELECT status FROM public.partner_applications
      WHERE id = '20000000-0000-0000-0000-000000000002') <> 'pending' THEN
    RAISE EXCEPTION 'invalid-rate attempt changed application state';
  END IF;
  IF EXISTS (SELECT 1 FROM public.partners
             WHERE application_id = '20000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'invalid-rate attempt created a partner';
  END IF;
END;
$$;

SELECT set_config('test.is_platform_staff', 'false', false);

DO $$
BEGIN
  BEGIN
    PERFORM public.approve_partner_application(
      '20000000-0000-0000-0000-000000000003', 20
    );
    RAISE EXCEPTION 'expected nonstaff approval to fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected nonstaff approval to fail' THEN RAISE; END IF;
    IF SQLERRM <> 'not authorized' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM public.partner_applications
      WHERE id = '20000000-0000-0000-0000-000000000003') <> 'pending' THEN
    RAISE EXCEPTION 'nonstaff attempt changed application state';
  END IF;
END;
$$;

SELECT 'partner approval smoke tests passed' AS result;
