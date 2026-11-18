\set ON_ERROR_STOP on
INSERT INTO public.partner_applications (contact_email,status)
VALUES ('Applicant@Example.com','pending');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.partner_applications (contact_email,status)
    VALUES ('applicant@example.com','pending');
    RAISE EXCEPTION 'expected duplicate pending email to be rejected';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO public.partner_applications (contact_email,status)
  VALUES ('applicant@example.com','rejected');

  UPDATE public.partner_applications
     SET status='rejected'
   WHERE lower(contact_email)='applicant@example.com'
     AND status='pending';

  INSERT INTO public.partner_applications (contact_email,status)
  VALUES ('applicant@example.com','pending');

  IF (SELECT count(*) FROM public.partner_applications
      WHERE lower(contact_email)='applicant@example.com' AND status='pending') <> 1 THEN
    RAISE EXCEPTION 'pending application uniqueness invariant failed';
  END IF;
END;
$$;
SELECT 'partner submission deduplication tests passed' AS result;
