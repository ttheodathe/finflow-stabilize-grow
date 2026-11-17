-- Generate a pay run and every payslip child row atomically.
-- This RPC is callable only by the server-side service role. The authenticated
-- server handler supplies the verified user id after its own auth middleware.
CREATE OR REPLACE FUNCTION public.create_pay_run_atomic(
  p_company_id uuid,
  p_user_id uuid,
  p_period_start date,
  p_period_end date,
  p_pay_date date,
  p_notes text,
  p_currency text,
  p_payslips jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_member_role text;
  v_member_status text;
  v_company_currency text;
  v_pay_run_id uuid;
  v_item jsonb;
  v_contribution jsonb;
  v_line_item jsonb;
  v_employee_id uuid;
  v_employee record;
  v_payslip_id uuid;
  v_base_salary numeric;
  v_gross_salary numeric;
  v_taxable_income numeric;
  v_paye numeric;
  v_employee_deductions numeric;
  v_net_pay numeric;
  v_employer_contributions numeric;
  v_employer_cost numeric;
  v_contribution_employee_total numeric;
  v_contribution_employer_total numeric;
  v_additions_total numeric;
  v_deductions_total numeric;
  v_total_gross numeric := 0;
  v_total_employee_deductions numeric := 0;
  v_total_net numeric := 0;
  v_total_employer_contributions numeric := 0;
  v_total_employer_cost numeric := 0;
  v_payload_count integer;
  v_unique_employee_count integer;
BEGIN
  IF p_user_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'A verified user and company are required'
      USING ERRCODE = '42501';
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL OR p_pay_date IS NULL
     OR p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Invalid payroll period or pay date';
  END IF;

  IF p_payslips IS NULL OR pg_catalog.jsonb_typeof(p_payslips) <> 'array'
     OR pg_catalog.jsonb_array_length(p_payslips) < 1
     OR pg_catalog.jsonb_array_length(p_payslips) > 500 THEN
    RAISE EXCEPTION 'Payroll must contain between 1 and 500 payslips';
  END IF;

  SELECT count(*)::integer,
         count(DISTINCT x.value->>'employee_id')::integer
    INTO v_payload_count, v_unique_employee_count
    FROM pg_catalog.jsonb_array_elements(p_payslips) AS x(value);

  IF v_payload_count <> v_unique_employee_count THEN
    RAISE EXCEPTION 'Duplicate employees are not allowed in a pay run';
  END IF;

  SELECT cm.role::text, cm.status::text
    INTO v_member_role, v_member_status
    FROM public.company_members cm
   WHERE cm.company_id = p_company_id
     AND cm.user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND OR v_member_status <> 'active'
     OR v_member_role NOT IN ('owner', 'admin', 'accountant') THEN
    RAISE EXCEPTION 'Only active company owners, admins and accountants may generate payroll'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.company_has_feature(p_company_id, 'payroll') THEN
    RAISE EXCEPTION 'Payroll requires an active eligible plan'
      USING ERRCODE = '42501';
  END IF;

  SELECT c.currency
    INTO v_company_currency
    FROM public.companies c
   WHERE c.id = p_company_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  IF p_currency IS DISTINCT FROM v_company_currency THEN
    RAISE EXCEPTION 'Pay-run currency must match the company base currency';
  END IF;

  -- Validate the entire payload and lock all employee salary rows before
  -- writing anything. This prevents a concurrent salary edit from changing
  -- the basis of a generated payslip.
  FOR v_item IN
    SELECT x.value
      FROM pg_catalog.jsonb_array_elements(p_payslips) AS x(value)
  LOOP
    IF NULLIF(v_item->>'employee_id', '') IS NULL
       OR pg_catalog.jsonb_typeof(COALESCE(v_item->'contributions', '[]'::jsonb)) <> 'array'
       OR pg_catalog.jsonb_typeof(COALESCE(v_item->'line_items', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'Invalid payslip payload';
    END IF;

    v_employee_id := (v_item->>'employee_id')::uuid;

    SELECT e.salary, e.salary_currency, e.employment_status
      INTO v_employee
      FROM public.employees e
     WHERE e.id = v_employee_id
       AND e.company_id = p_company_id
     FOR UPDATE;

    IF NOT FOUND OR v_employee.employment_status = 'terminated' THEN
      RAISE EXCEPTION 'Employee is unavailable or terminated in this company';
    END IF;

    IF v_employee.salary_currency IS DISTINCT FROM v_company_currency THEN
      RAISE EXCEPTION 'Employee salary currency must match the company base currency';
    END IF;

    v_base_salary := (v_item->>'base_salary')::numeric;
    v_gross_salary := (v_item->>'gross_salary')::numeric;
    v_taxable_income := (v_item->>'taxable_income')::numeric;
    v_paye := (v_item->>'paye')::numeric;
    v_employee_deductions := (v_item->>'total_employee_deductions')::numeric;
    v_net_pay := (v_item->>'net_pay')::numeric;
    v_employer_contributions := (v_item->>'total_employer_contributions')::numeric;
    v_employer_cost := (v_item->>'total_employer_cost')::numeric;

    IF v_base_salary < 0 OR v_gross_salary < 0 OR v_taxable_income < 0
       OR v_paye < 0 OR v_employee_deductions < 0 OR v_net_pay < 0
       OR v_employer_contributions < 0 OR v_employer_cost < 0 THEN
      RAISE EXCEPTION 'Payroll amounts cannot be negative';
    END IF;

    IF pg_catalog.abs(v_employee.salary - v_base_salary) > 0.01 THEN
      RAISE EXCEPTION 'Employee salary changed during payroll generation; refresh and retry';
    END IF;

    IF v_item->>'currency' IS DISTINCT FROM v_company_currency THEN
      RAISE EXCEPTION 'Payslip currency must match the company base currency';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM pg_catalog.jsonb_array_elements(COALESCE(v_item->'line_items', '[]'::jsonb)) AS li(value)
       WHERE li.value->>'kind' NOT IN ('addition', 'deduction')
          OR NULLIF(pg_catalog.btrim(li.value->>'label'), '') IS NULL
          OR COALESCE(NULLIF(li.value->>'amount', '')::numeric, 0) <= 0
    ) THEN
      RAISE EXCEPTION 'Payslip line items contain an invalid kind, label or amount';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM pg_catalog.jsonb_array_elements(COALESCE(v_item->'contributions', '[]'::jsonb)) AS c(value)
       WHERE NULLIF(pg_catalog.btrim(c.value->>'name'), '') IS NULL
          OR COALESCE(NULLIF(c.value->>'employee_amount', '')::numeric, -1) < 0
          OR COALESCE(NULLIF(c.value->>'employer_amount', '')::numeric, -1) < 0
    ) THEN
      RAISE EXCEPTION 'Payslip contributions contain an invalid name or amount';
    END IF;

    SELECT
      COALESCE(sum(CASE WHEN li.value->>'kind' = 'addition'
                        THEN (li.value->>'amount')::numeric ELSE 0 END), 0),
      COALESCE(sum(CASE WHEN li.value->>'kind' = 'deduction'
                        THEN (li.value->>'amount')::numeric ELSE 0 END), 0)
      INTO v_additions_total, v_deductions_total
      FROM pg_catalog.jsonb_array_elements(COALESCE(v_item->'line_items', '[]'::jsonb)) AS li(value);

    SELECT
      COALESCE(sum((c.value->>'employee_amount')::numeric), 0),
      COALESCE(sum((c.value->>'employer_amount')::numeric), 0)
      INTO v_contribution_employee_total, v_contribution_employer_total
      FROM pg_catalog.jsonb_array_elements(COALESCE(v_item->'contributions', '[]'::jsonb)) AS c(value);

    IF pg_catalog.abs(v_gross_salary - (v_base_salary + v_additions_total)) > 0.01
       OR pg_catalog.abs(v_employee_deductions -
          (v_paye + v_contribution_employee_total + v_deductions_total)) > 0.01
       OR pg_catalog.abs(v_net_pay - (v_gross_salary - v_employee_deductions)) > 0.01
       OR pg_catalog.abs(v_employer_contributions - v_contribution_employer_total) > 0.01
       OR pg_catalog.abs(v_employer_cost - (v_gross_salary + v_employer_contributions)) > 0.01
       OR v_taxable_income > v_gross_salary + 0.01 THEN
      RAISE EXCEPTION 'Payslip totals do not reconcile with the supplied line items';
    END IF;

    v_total_gross := v_total_gross + v_gross_salary;
    v_total_employee_deductions := v_total_employee_deductions + v_employee_deductions;
    v_total_net := v_total_net + v_net_pay;
    v_total_employer_contributions := v_total_employer_contributions + v_employer_contributions;
    v_total_employer_cost := v_total_employer_cost + v_employer_cost;
  END LOOP;

  INSERT INTO public.pay_runs (
    company_id, period_start, period_end, pay_date, status, notes,
    created_by, currency, total_gross, total_employee_deductions,
    total_net, total_employer_contributions, total_employer_cost
  )
  VALUES (
    p_company_id, p_period_start, p_period_end, p_pay_date, 'draft',
    NULLIF(pg_catalog.btrim(p_notes), ''), p_user_id, p_currency,
    pg_catalog.round(v_total_gross, 2),
    pg_catalog.round(v_total_employee_deductions, 2),
    pg_catalog.round(v_total_net, 2),
    pg_catalog.round(v_total_employer_contributions, 2),
    pg_catalog.round(v_total_employer_cost, 2)
  )
  RETURNING id INTO v_pay_run_id;

  FOR v_item IN
    SELECT x.value
      FROM pg_catalog.jsonb_array_elements(p_payslips) AS x(value)
  LOOP
    INSERT INTO public.payslips (
      company_id, pay_run_id, employee_id, base_salary, gross_salary,
      taxable_income, paye, total_employee_deductions, net_pay,
      total_employer_contributions, total_employer_cost, currency
    )
    VALUES (
      p_company_id, v_pay_run_id, (v_item->>'employee_id')::uuid,
      (v_item->>'base_salary')::numeric, (v_item->>'gross_salary')::numeric,
      (v_item->>'taxable_income')::numeric, (v_item->>'paye')::numeric,
      (v_item->>'total_employee_deductions')::numeric, (v_item->>'net_pay')::numeric,
      (v_item->>'total_employer_contributions')::numeric,
      (v_item->>'total_employer_cost')::numeric, v_company_currency
    )
    RETURNING id INTO v_payslip_id;

    FOR v_contribution IN
      SELECT c.value
        FROM pg_catalog.jsonb_array_elements(COALESCE(v_item->'contributions', '[]'::jsonb)) AS c(value)
    LOOP
      INSERT INTO public.payslip_contributions (
        payslip_id, name, employee_amount, employer_amount
      )
      VALUES (
        v_payslip_id, v_contribution->>'name',
        (v_contribution->>'employee_amount')::numeric,
        (v_contribution->>'employer_amount')::numeric
      );
    END LOOP;

    FOR v_line_item IN
      SELECT li.value
        FROM pg_catalog.jsonb_array_elements(COALESCE(v_item->'line_items', '[]'::jsonb)) AS li(value)
    LOOP
      INSERT INTO public.payslip_line_items (payslip_id, kind, label, amount)
      VALUES (
        v_payslip_id, v_line_item->>'kind',
        v_line_item->>'label', (v_line_item->>'amount')::numeric
      );
    END LOOP;
  END LOOP;

  RETURN v_pay_run_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_pay_run_atomic(uuid, uuid, date, date, date, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pay_run_atomic(uuid, uuid, date, date, date, text, text, jsonb)
  TO service_role;
