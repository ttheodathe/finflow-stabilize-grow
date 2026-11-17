-- Tests every payroll entitlement trigger installed by the migration.
BEGIN;
INSERT INTO public.companies(id, organization_id)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_company uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_payslip uuid := '55555555-5555-4555-8555-555555555555';
BEGIN
  PERFORM set_config('test.payroll_enabled','false',false);

  BEGIN
    INSERT INTO public.payroll_tax_brackets(id,company_id,status)
    VALUES ('66666666-6666-4666-8666-666666666666',v_company,'draft');
    RAISE EXCEPTION 'Payroll tax bracket insert was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  BEGIN
    INSERT INTO public.payroll_statutory_contributions(id,company_id,status)
    VALUES ('77777777-7777-4777-8777-777777777777',v_company,'draft');
    RAISE EXCEPTION 'Statutory contribution insert was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  BEGIN
    INSERT INTO public.payslips(id,company_id,status)
    VALUES (v_payslip,v_company,'draft');
    RAISE EXCEPTION 'Payslip insert was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  PERFORM set_config('test.payroll_enabled','true',false);
  INSERT INTO public.payroll_tax_brackets(id,company_id,status)
  VALUES ('66666666-6666-4666-8666-666666666666',v_company,'draft');
  INSERT INTO public.payroll_statutory_contributions(id,company_id,status)
  VALUES ('77777777-7777-4777-8777-777777777777',v_company,'draft');
  INSERT INTO public.payslips(id,company_id,status)
  VALUES (v_payslip,v_company,'draft');
  INSERT INTO public.payslip_contributions(id,company_id,payslip_id,status)
  VALUES ('88888888-8888-4888-8888-888888888888',v_company,v_payslip,'draft');
  INSERT INTO public.payslip_line_items(id,company_id,payslip_id,status)
  VALUES ('99999999-9999-4999-8999-999999999999',v_company,v_payslip,'draft');

  PERFORM set_config('test.payroll_enabled','false',false);

  BEGIN
    UPDATE public.payroll_tax_brackets SET status='changed'
    WHERE id='66666666-6666-4666-8666-666666666666';
    RAISE EXCEPTION 'Payroll tax bracket update was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  BEGIN
    UPDATE public.payroll_statutory_contributions SET status='changed'
    WHERE id='77777777-7777-4777-8777-777777777777';
    RAISE EXCEPTION 'Statutory contribution update was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  BEGIN
    UPDATE public.payslips SET status='changed' WHERE id=v_payslip;
    RAISE EXCEPTION 'Payslip update was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  BEGIN
    UPDATE public.payslip_contributions SET status='changed'
    WHERE id='88888888-8888-4888-8888-888888888888';
    RAISE EXCEPTION 'Payslip contribution update was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  BEGIN
    UPDATE public.payslip_line_items SET status='changed'
    WHERE id='99999999-9999-4999-8999-999999999999';
    RAISE EXCEPTION 'Payslip line-item update was not blocked' USING ERRCODE='P0002';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;

  -- Deletion remains available for cleanup even when the feature is locked.
  DELETE FROM public.payroll_tax_brackets
   WHERE id='66666666-6666-4666-8666-666666666666';
  DELETE FROM public.payroll_statutory_contributions
   WHERE id='77777777-7777-4777-8777-777777777777';
  DELETE FROM public.payslip_contributions
   WHERE id='88888888-8888-4888-8888-888888888888';
  DELETE FROM public.payslip_line_items
   WHERE id='99999999-9999-4999-8999-999999999999';
END $$;
ROLLBACK;
