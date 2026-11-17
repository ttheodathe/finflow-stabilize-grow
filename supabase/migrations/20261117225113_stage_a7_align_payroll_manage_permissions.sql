-- Align payroll.manage for accountants with the existing RBAC role-permission
-- assignment and the payroll UI's authenticated Supabase reads/updates.

ALTER POLICY "hr roles write pay_runs" ON public.pay_runs
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
)
WITH CHECK (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select pay_runs" ON public.pay_runs
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select employees" ON public.employees
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select tax brackets" ON public.payroll_tax_brackets
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles write statutory" ON public.payroll_statutory_contributions
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
)
WITH CHECK (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select statutory" ON public.payroll_statutory_contributions
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select payslips" ON public.payslips
USING (
  public.is_company_member(company_id)
  AND public.get_company_role(company_id) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select payslip_contributions" ON public.payslip_contributions
USING (
  public.is_company_member((
    SELECT p.company_id FROM public.payslips p
    WHERE p.id = payslip_contributions.payslip_id
  ))
  AND public.get_company_role((
    SELECT p.company_id FROM public.payslips p
    WHERE p.id = payslip_contributions.payslip_id
  )) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

ALTER POLICY "hr roles select payslip_line_items" ON public.payslip_line_items
USING (
  public.is_company_member((
    SELECT p.company_id FROM public.payslips p
    WHERE p.id = payslip_line_items.payslip_id
  ))
  AND public.get_company_role((
    SELECT p.company_id FROM public.payslips p
    WHERE p.id = payslip_line_items.payslip_id
  )) = ANY (ARRAY[
    'owner'::public.company_member_role,
    'admin'::public.company_member_role,
    'accountant'::public.company_member_role,
    'hr'::public.company_member_role,
    'payroll'::public.company_member_role
  ])
);

-- Keep the atomic generation/posting RPCs restricted to trusted server-side
-- callers, while allowing the accountant system role that already has
-- payroll.manage to perform those operations through the authenticated app.
DO $$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  v_definition := pg_get_functiondef(
    'public.create_pay_run_atomic(uuid,uuid,date,date,date,text,text,jsonb)'::regprocedure
  );
  v_old := 'v_member_role NOT IN (''owner'', ''admin'', ''payroll'')';
  v_new := 'v_member_role NOT IN (''owner'', ''admin'', ''accountant'', ''payroll'')';
  IF position(v_old IN v_definition) > 0 THEN
    v_definition := replace(v_definition, v_old, v_new);
  ELSIF position(v_new IN v_definition) = 0 THEN
    RAISE EXCEPTION 'create_pay_run_atomic role guard did not match expected source';
  END IF;
  EXECUTE v_definition;

  v_definition := pg_get_functiondef(
    'public.post_payrun_to_ledger(uuid,uuid,uuid,uuid,uuid)'::regprocedure
  );
  v_old := '       ''admin''::public.company_member_role,' || chr(10) ||
           '       ''payroll''::public.company_member_role';
  v_new := '       ''admin''::public.company_member_role,' || chr(10) ||
           '       ''accountant''::public.company_member_role,' || chr(10) ||
           '       ''payroll''::public.company_member_role';
  IF position(v_old IN v_definition) > 0 THEN
    v_definition := replace(v_definition, v_old, v_new);
  ELSIF position(v_new IN v_definition) = 0 THEN
    RAISE EXCEPTION 'post_payrun_to_ledger role guard did not match expected source';
  END IF;
  EXECUTE v_definition;
END;
$$;
