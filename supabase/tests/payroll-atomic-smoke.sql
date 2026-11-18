-- Exercise the real atomic payroll RPC against a disposable PostgreSQL schema.
INSERT INTO public.companies(id,currency)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','USD');

INSERT INTO public.company_members(company_id,user_id,role,status)
VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'payroll',
  'active'
);

INSERT INTO public.employees(id,company_id,salary,salary_currency,employment_status)
VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1000,'USD','active'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',600,'USD','active');

SET ROLE service_role;

DO $test$
DECLARE
  v_payload jsonb := jsonb_build_array(jsonb_build_object(
    'employee_id','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'base_salary',1000,
    'gross_salary',1100,
    'taxable_income',1100,
    'paye',110,
    'total_employee_deductions',150,
    'net_pay',950,
    'total_employer_contributions',20,
    'total_employer_cost',1120,
    'currency','USD',
    'contributions',jsonb_build_array(jsonb_build_object(
      'name','Pension','employee_amount',30,'employer_amount',20
    )),
    'line_items',jsonb_build_array(
      jsonb_build_object('kind','addition','label','Bonus','amount',100),
      jsonb_build_object('kind','deduction','label','Loan repayment','amount',10)
    )
  ));
  v_bad_totals jsonb;
  v_duplicate jsonb;
  v_bad_batch jsonb;
  v_run_id uuid;
  v_before integer;
  v_after integer;
BEGIN
  PERFORM set_config('test.payroll_enabled','true',false);
  IF has_function_privilege('service_role',
       'public.create_pay_run_atomic(uuid,uuid,date,date,date,text,text,jsonb)','EXECUTE') IS NOT TRUE THEN
    RAISE EXCEPTION 'service_role must be allowed to execute atomic payroll generation';
  END IF;
  IF has_function_privilege('authenticated',
       'public.create_pay_run_atomic(uuid,uuid,date,date,date,text,text,jsonb)','EXECUTE') IS TRUE THEN
    RAISE EXCEPTION 'authenticated must not execute the service-only payroll RPC';
  END IF;

  -- Valid generation writes one pay run, one payslip and all child rows.
  v_run_id := public.create_pay_run_atomic(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '2026-10-01','2026-10-31','2026-11-05','October payroll','USD',v_payload
  );
  IF v_run_id IS NULL THEN RAISE EXCEPTION 'Atomic payroll RPC returned no id'; END IF;

  IF (SELECT count(*) FROM public.pay_runs WHERE id=v_run_id) <> 1
     OR (SELECT count(*) FROM public.payslips WHERE pay_run_id=v_run_id) <> 1
     OR (SELECT count(*) FROM public.payslip_contributions pc
          JOIN public.payslips ps ON ps.id=pc.payslip_id WHERE ps.pay_run_id=v_run_id) <> 1
     OR (SELECT count(*) FROM public.payslip_line_items li
          JOIN public.payslips ps ON ps.id=li.payslip_id WHERE ps.pay_run_id=v_run_id) <> 2 THEN
    RAISE EXCEPTION 'Atomic payroll generation did not write the complete payslip graph';
  END IF;

  IF (SELECT total_gross FROM public.pay_runs WHERE id=v_run_id) <> 1100
     OR (SELECT total_employee_deductions FROM public.pay_runs WHERE id=v_run_id) <> 150
     OR (SELECT total_net FROM public.pay_runs WHERE id=v_run_id) <> 950
     OR (SELECT total_employer_contributions FROM public.pay_runs WHERE id=v_run_id) <> 20
     OR (SELECT total_employer_cost FROM public.pay_runs WHERE id=v_run_id) <> 1120 THEN
    RAISE EXCEPTION 'Pay-run aggregate totals do not reconcile';
  END IF;

  -- A viewer cannot generate payroll.
  UPDATE public.company_members SET role='viewer'
   WHERE company_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  BEGIN
    PERFORM public.create_pay_run_atomic(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '2026-11-01','2026-11-30','2026-12-05',NULL,'USD',v_payload
    );
    RAISE EXCEPTION 'Viewer unexpectedly generated payroll';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  UPDATE public.company_members SET role='payroll'
   WHERE company_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  -- A non-member cannot generate payroll for this company.
  BEGIN
    PERFORM public.create_pay_run_atomic(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '2026-11-01','2026-11-30','2026-12-05',NULL,'USD',v_payload
    );
    RAISE EXCEPTION 'Non-member unexpectedly generated payroll';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  -- A company without the payroll feature cannot generate payroll.
  PERFORM set_config('test.payroll_enabled','false',false);
  BEGIN
    PERFORM public.create_pay_run_atomic(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '2026-11-01','2026-11-30','2026-12-05',NULL,'USD',v_payload
    );
    RAISE EXCEPTION 'Locked plan unexpectedly generated payroll';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
  PERFORM set_config('test.payroll_enabled','true',false);

  -- Duplicate employees and inconsistent payslip arithmetic are rejected.
  v_duplicate := v_payload || v_payload;
  BEGIN
    PERFORM public.create_pay_run_atomic(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '2026-11-01','2026-11-30','2026-12-05',NULL,'USD',v_duplicate
    );
    RAISE EXCEPTION 'Duplicate employee payload unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Duplicate employees are not allowed%' THEN RAISE; END IF;
  END;

  v_bad_totals := jsonb_set(v_payload,'{0,net_pay}','951'::jsonb);
  BEGIN
    PERFORM public.create_pay_run_atomic(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '2026-11-01','2026-11-30','2026-12-05',NULL,'USD',v_bad_totals
    );
    RAISE EXCEPTION 'Inconsistent payslip totals unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Payslip totals do not reconcile%' THEN RAISE; END IF;
  END;

  -- If a later employee in a batch is invalid, no partial pay run is written.
  v_bad_batch := v_payload || jsonb_build_array(jsonb_set(
    jsonb_set(v_payload->0,'{employee_id}','"dddddddd-dddd-4ddd-8ddd-dddddddddddd"'::jsonb),
    '{base_salary}','500'::jsonb
  ));
  SELECT count(*) INTO v_before FROM public.pay_runs;
  BEGIN
    PERFORM public.create_pay_run_atomic(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '2026-11-01','2026-11-30','2026-12-05',NULL,'USD',v_bad_batch
    );
    RAISE EXCEPTION 'Invalid later payslip unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Employee salary changed during payroll generation%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO v_after FROM public.pay_runs;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'Invalid batch left a partial pay run behind';
  END IF;
END $test$;

RESET ROLE;
