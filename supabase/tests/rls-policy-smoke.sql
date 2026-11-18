-- Applies after the migration in the ephemeral CI database.
DO $smoke1$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname='public'
    AND policyname IN (
      'company and organization members view companies',
      'company or organization admins update companies',
      'company owners or organization admins delete companies',
      'organization admins insert companies',
      'company admins or members view company roster',
      'company admins insert members',
      'company admins update members',
      'company admins delete members',
      'company admins or members view settings',
      'company admins insert settings',
      'company admins update settings',
      'company admins delete settings',
      'company admins or members view tax settings',
      'company admins insert tax settings',
      'company admins update tax settings',
      'company admins delete tax settings',
      'non-viewer members insert extractions',
      'non-viewer members update extractions',
      'non-viewer members delete extractions',
      'non-viewer members insert validations',
      'non-viewer members update validations',
      'non-viewer members delete validations',
      'organization admins or invitees view invitations',
      'organization admins insert invitations',
      'organization admins update invitations',
      'organization admins delete invitations',
      'organization admins or members view roster',
      'organization admins or owner bootstrap insert members',
      'organization admins update members',
      'organization admins delete members',
      'partners or staff view payouts',
      'staff insert payouts',
      'staff update payouts',
      'staff delete payouts',
      'partners or staff view partner records',
      'staff insert partners',
      'staff update partners',
      'staff delete partners',
      'payroll roles update pay_runs',
      'payroll roles insert statutory',
      'payroll roles update statutory',
      'payroll roles delete statutory',
      'payroll roles insert tax brackets',
      'payroll roles update tax brackets',
      'payroll roles delete tax brackets',
      'members or admins read role permissions',
      'company admins insert role permissions',
      'company admins update role permissions',
      'company admins delete role permissions',
      'members or admins read roles',
      'company admins insert roles',
      'company admins update roles',
      'company admins delete roles',
      'company admins or members update tax returns'
    );
  IF n <> 54 THEN
    RAISE EXCEPTION 'Expected 54 replacement policies, found %', n;
  END IF;
  IF has_table_privilege('authenticated','public.pay_runs','INSERT')
     OR has_table_privilege('authenticated','public.pay_runs','DELETE') THEN
    RAISE EXCEPTION 'Authenticated users must not insert or delete pay runs directly';
  END IF;
  IF NOT has_column_privilege('authenticated','public.pay_runs','status','UPDATE')
     OR NOT has_column_privilege('authenticated','public.pay_runs','approved_by','UPDATE')
     OR NOT has_column_privilege('authenticated','public.pay_runs','approved_at','UPDATE') THEN
    RAISE EXCEPTION 'Authenticated approval/cancellation columns are not writable';
  END IF;
  IF has_column_privilege('authenticated','public.pay_runs','total_gross','UPDATE')
     OR has_column_privilege('authenticated','public.pay_runs','total_net','UPDATE')
     OR has_column_privilege('authenticated','public.pay_runs','journal_entry_id','UPDATE')
     OR has_column_privilege('authenticated','public.pay_runs','paid_at','UPDATE') THEN
    RAISE EXCEPTION 'Authenticated users can modify protected pay-run financial fields';
  END IF;
  IF has_table_privilege('authenticated','public.payslips','INSERT')
     OR has_table_privilege('authenticated','public.payslips','UPDATE')
     OR has_table_privilege('authenticated','public.payslips','DELETE')
     OR has_table_privilege('authenticated','public.payslip_contributions','INSERT')
     OR has_table_privilege('authenticated','public.payslip_contributions','UPDATE')
     OR has_table_privilege('authenticated','public.payslip_contributions','DELETE')
     OR has_table_privilege('authenticated','public.payslip_line_items','INSERT')
     OR has_table_privilege('authenticated','public.payslip_line_items','UPDATE')
     OR has_table_privilege('authenticated','public.payslip_line_items','DELETE') THEN
    RAISE EXCEPTION 'Authenticated users must not directly write generated payslip records';
  END IF;
END $smoke1$;

INSERT INTO public.companies(id, organization_id) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
INSERT INTO public.tax_returns(id, company_id, status) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','draft'),
 ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','submitted'),
 ('44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','draft');
INSERT INTO public.pay_runs(id, company_id, status) VALUES
 ('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','draft');

SET ROLE authenticated;
SELECT set_config('test.company_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
SELECT set_config('test.organization_id','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
SELECT set_config('test.org_admin','false',false);
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);

DO $smoke2$
DECLARE n integer;
BEGIN
  -- Tenant A must not see tenant B's company.
  SELECT count(*) INTO n FROM public.companies;
  IF n <> 1 THEN RAISE EXCEPTION 'Tenant isolation failed: expected 1 company, got %', n; END IF;

  -- Viewers cannot update draft tax returns.
  PERFORM set_config('test.company_role','viewer',false);
  UPDATE public.tax_returns SET description='viewer-attempt'
   WHERE id='11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Viewer unexpectedly updated a draft tax return'; END IF;

  -- Accountants can update draft returns but not submitted returns.
  PERFORM set_config('test.company_role','accountant',false);
  UPDATE public.tax_returns SET description='accountant-draft'
   WHERE id='11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Accountant could not update a draft tax return'; END IF;
  UPDATE public.tax_returns SET description='accountant-submitted'
   WHERE id='22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Accountant unexpectedly updated a submitted tax return'; END IF;

  -- A member of company A must not update company B's return.
  UPDATE public.tax_returns SET description='cross-tenant-attempt'
   WHERE id='44444444-4444-4444-8444-444444444444';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Cross-tenant tax return update unexpectedly succeeded'; END IF;

  -- Company admins retain authority to update submitted returns.
  PERFORM set_config('test.company_role','admin',false);
  UPDATE public.tax_returns SET description='admin-submitted'
   WHERE id='22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Admin could not update a submitted tax return'; END IF;

  -- Accountant is in the pay-run write allowlist.
  PERFORM set_config('test.company_role','accountant',false);
  UPDATE public.pay_runs SET status='approved'
   WHERE id='33333333-3333-4333-8333-333333333333';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Accountant could not update a pay run'; END IF;
END $smoke2$;
RESET ROLE;
