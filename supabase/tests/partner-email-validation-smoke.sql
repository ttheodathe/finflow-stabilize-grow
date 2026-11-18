\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE anon;
SELECT public.submit_partner_application(
  'affiliate'::public.partner_type,
  'CI Email Validation',
  'Rwanda',
  'Applicant+CI@Example.com',
  TRUE
) AS valid_id \gset

RESET ROLE;
SELECT set_config('request.test.valid_id', :'valid_id', true);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_applications
    WHERE id = current_setting('request.test.valid_id')::uuid
      AND contact_email = 'applicant+ci@example.com'
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'valid email was not normalized and stored';
  END IF;
END;
$$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.submit_partner_application(
      'affiliate'::public.partner_type,
      'Invalid Email',
      'Rwanda',
      'not-an-email',
      TRUE
    );
    RAISE EXCEPTION 'invalid email was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'A valid contact email is required' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM public.submit_partner_application(
      'affiliate'::public.partner_type,
      'Duplicate Email',
      'Rwanda',
      'APPLICANT+CI@example.com',
      TRUE
    );
    RAISE EXCEPTION 'duplicate pending email was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;
ROLLBACK;
SELECT 'partner application email validation tests passed' AS result;
