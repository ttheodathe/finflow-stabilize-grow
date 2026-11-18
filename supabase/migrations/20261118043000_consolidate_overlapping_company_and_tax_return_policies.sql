-- Remove redundant permissive-policy overlap without widening or narrowing access.
-- PostgreSQL permissive policies are OR-combined; command-specific replacements below
-- preserve each original USING and WITH CHECK predicate.

-- COMPANIES: split the organization-admin ALL policy by command and combine
-- the SELECT/UPDATE/DELETE predicates with their existing company-scoped policies.
DROP POLICY IF EXISTS "company and organization members view companies" ON public.companies;
DROP POLICY IF EXISTS "company members view companies" ON public.companies;
DROP POLICY IF EXISTS "org members view companies" ON public.companies;
DROP POLICY IF EXISTS "company admins update companies" ON public.companies;
DROP POLICY IF EXISTS "company owner deletes company" ON public.companies;
DROP POLICY IF EXISTS "org admins manage companies" ON public.companies;
CREATE POLICY "company and organization members view companies"
  ON public.companies FOR SELECT TO public
  USING (public.is_company_member(id) OR public.is_org_member(organization_id) OR public.is_org_admin(organization_id));
CREATE POLICY "company or organization admins update companies"
  ON public.companies FOR UPDATE TO public
  USING (public.is_company_admin(id) OR public.is_org_admin(organization_id))
  WITH CHECK (public.is_company_admin(id) OR public.is_org_admin(organization_id));
CREATE POLICY "company owners or organization admins delete companies"
  ON public.companies FOR DELETE TO public
  USING (public.get_company_role(id) = 'owner'::public.company_member_role OR public.is_org_admin(organization_id));
CREATE POLICY "organization admins insert companies"
  ON public.companies FOR INSERT TO public
  WITH CHECK (public.is_org_admin(organization_id));

-- COMPANY MEMBERS: preserve admin writes, own-row visibility and roster visibility.
DROP POLICY IF EXISTS "admins manage company members" ON public.company_members;
DROP POLICY IF EXISTS "members view their company roster" ON public.company_members;
CREATE POLICY "company admins or members view company roster"
  ON public.company_members FOR SELECT TO public
  USING (
    public.is_company_admin(company_id)
    OR public.is_company_member(company_id)
    OR user_id = (SELECT auth.uid())
  );
CREATE POLICY "company admins insert members"
  ON public.company_members FOR INSERT TO public
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "company admins update members"
  ON public.company_members FOR UPDATE TO public
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "company admins delete members"
  ON public.company_members FOR DELETE TO public
  USING (public.is_company_admin(company_id));

-- COMPANY SETTINGS: admins retain full management; members retain read access.
DROP POLICY IF EXISTS "admins manage company settings" ON public.company_settings;
DROP POLICY IF EXISTS "members view company settings" ON public.company_settings;
CREATE POLICY "company admins or members view settings"
  ON public.company_settings FOR SELECT TO public
  USING (public.is_company_admin(company_id) OR public.is_company_member(company_id));
CREATE POLICY "company admins insert settings"
  ON public.company_settings FOR INSERT TO public
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "company admins update settings"
  ON public.company_settings FOR UPDATE TO public
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "company admins delete settings"
  ON public.company_settings FOR DELETE TO public
  USING (public.is_company_admin(company_id));

-- COMPANY TAX SETTINGS.
DROP POLICY IF EXISTS "admins manage tax settings" ON public.company_tax_settings;
DROP POLICY IF EXISTS "members view tax settings" ON public.company_tax_settings;
CREATE POLICY "company admins or members view tax settings"
  ON public.company_tax_settings FOR SELECT TO public
  USING (public.is_company_admin(company_id) OR public.is_company_member(company_id));
CREATE POLICY "company admins insert tax settings"
  ON public.company_tax_settings FOR INSERT TO public
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "company admins update tax settings"
  ON public.company_tax_settings FOR UPDATE TO public
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "company admins delete tax settings"
  ON public.company_tax_settings FOR DELETE TO public
  USING (public.is_company_admin(company_id));

-- DOCUMENT EXTRACTIONS: keep the broad member SELECT policy; split write ALL
-- into the original non-viewer INSERT/UPDATE/DELETE predicates.
DROP POLICY IF EXISTS "company members write extractions" ON public.document_extractions;
CREATE POLICY "non-viewer members insert extractions"
  ON public.document_extractions FOR INSERT TO public
  WITH CHECK (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
      <> 'viewer'::public.company_member_role
  );
CREATE POLICY "non-viewer members update extractions"
  ON public.document_extractions FOR UPDATE TO public
  USING (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
      <> 'viewer'::public.company_member_role
  )
  WITH CHECK (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
      <> 'viewer'::public.company_member_role
  );
CREATE POLICY "non-viewer members delete extractions"
  ON public.document_extractions FOR DELETE TO public
  USING (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_extractions.document_id))
      <> 'viewer'::public.company_member_role
  );

-- DOCUMENT VALIDATIONS.
DROP POLICY IF EXISTS "company members write validations" ON public.document_validations;
CREATE POLICY "non-viewer members insert validations"
  ON public.document_validations FOR INSERT TO public
  WITH CHECK (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
      <> 'viewer'::public.company_member_role
  );
CREATE POLICY "non-viewer members update validations"
  ON public.document_validations FOR UPDATE TO public
  USING (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
      <> 'viewer'::public.company_member_role
  )
  WITH CHECK (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
      <> 'viewer'::public.company_member_role
  );
CREATE POLICY "non-viewer members delete validations"
  ON public.document_validations FOR DELETE TO public
  USING (
    public.is_company_member((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
    AND public.get_company_role((SELECT d.company_id FROM public.documents d WHERE d.id = document_validations.document_id))
      <> 'viewer'::public.company_member_role
  );

-- ORGANIZATION INVITATIONS: administrators retain full management; invitees
-- retain access to their own invitation row.
DROP POLICY IF EXISTS "admins manage invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "invitee views own invitation" ON public.organization_invitations;
CREATE POLICY "organization admins or invitees view invitations"
  ON public.organization_invitations FOR SELECT TO public
  USING (
    public.is_org_admin(organization_id)
    OR lower(email) = lower((SELECT u.email FROM auth.users u WHERE u.id = (SELECT auth.uid()))::text)
  );
CREATE POLICY "organization admins insert invitations"
  ON public.organization_invitations FOR INSERT TO public
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "organization admins update invitations"
  ON public.organization_invitations FOR UPDATE TO public
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "organization admins delete invitations"
  ON public.organization_invitations FOR DELETE TO public
  USING (public.is_org_admin(organization_id));

-- ORGANIZATION MEMBERS: preserve the owner bootstrap path and admin management.
DROP POLICY IF EXISTS "admins manage members" ON public.organization_members;
DROP POLICY IF EXISTS "members view org members" ON public.organization_members;
DROP POLICY IF EXISTS "owner bootstraps membership" ON public.organization_members;
CREATE POLICY "organization admins or members view roster"
  ON public.organization_members FOR SELECT TO public
  USING (
    public.is_org_admin(organization_id)
    OR public.is_org_member(organization_id)
    OR user_id = (SELECT auth.uid())
  );
CREATE POLICY "organization admins or owner bootstrap insert members"
  ON public.organization_members FOR INSERT TO public
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (
      role = 'owner'::public.org_member_role
      AND user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_members.organization_id
          AND o.owner_id = (SELECT auth.uid())
      )
    )
  );
CREATE POLICY "organization admins update members"
  ON public.organization_members FOR UPDATE TO public
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "organization admins delete members"
  ON public.organization_members FOR DELETE TO public
  USING (public.is_org_admin(organization_id));

-- PARTNER PAYOUTS: partner self-read and staff management remain unchanged.
DROP POLICY IF EXISTS "partner can view own payouts" ON public.partner_payouts;
DROP POLICY IF EXISTS "staff can manage payouts" ON public.partner_payouts;
CREATE POLICY "partners or staff view payouts"
  ON public.partner_payouts FOR SELECT TO authenticated
  USING (
    public.is_platform_staff()
    OR EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_payouts.partner_id
        AND p.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "staff insert payouts"
  ON public.partner_payouts FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());
CREATE POLICY "staff update payouts"
  ON public.partner_payouts FOR UPDATE TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());
CREATE POLICY "staff delete payouts"
  ON public.partner_payouts FOR DELETE TO authenticated
  USING (public.is_platform_staff());

-- PARTNERS.
DROP POLICY IF EXISTS "partner can view own record" ON public.partners;
DROP POLICY IF EXISTS "staff can manage partners" ON public.partners;
CREATE POLICY "partners or staff view partner records"
  ON public.partners FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_staff());
CREATE POLICY "staff insert partners"
  ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());
CREATE POLICY "staff update partners"
  ON public.partners FOR UPDATE TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());
CREATE POLICY "staff delete partners"
  ON public.partners FOR DELETE TO authenticated
  USING (public.is_platform_staff());

-- PAY RUNS: generation is service-role-only; authenticated users may only
-- approve/cancel through the narrow UPDATE columns granted by the follow-up
-- payroll integrity migration. Never expose direct INSERT or DELETE.
DROP POLICY IF EXISTS "hr roles write pay_runs" ON public.pay_runs;
CREATE POLICY "payroll roles update pay_runs"
  ON public.pay_runs FOR UPDATE TO public
  USING (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'accountant'::public.company_member_role,'payroll'::public.company_member_role]
  ))
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'accountant'::public.company_member_role,'payroll'::public.company_member_role]
  ));
-- PAYROLL STATUTORY CONTRIBUTIONS.
DROP POLICY IF EXISTS "hr roles write statutory" ON public.payroll_statutory_contributions;
CREATE POLICY "payroll roles insert statutory"
  ON public.payroll_statutory_contributions FOR INSERT TO public
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'accountant'::public.company_member_role,'payroll'::public.company_member_role]
  ));
CREATE POLICY "payroll roles update statutory"
  ON public.payroll_statutory_contributions FOR UPDATE TO public
  USING (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'accountant'::public.company_member_role,'payroll'::public.company_member_role]
  ))
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'accountant'::public.company_member_role,'payroll'::public.company_member_role]
  ));
CREATE POLICY "payroll roles delete statutory"
  ON public.payroll_statutory_contributions FOR DELETE TO public
  USING (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'accountant'::public.company_member_role,'payroll'::public.company_member_role]
  ));

-- PAYROLL TAX BRACKETS.
DROP POLICY IF EXISTS "hr roles write tax brackets" ON public.payroll_tax_brackets;
CREATE POLICY "payroll roles insert tax brackets"
  ON public.payroll_tax_brackets FOR INSERT TO public
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'payroll'::public.company_member_role]
  ));
CREATE POLICY "payroll roles update tax brackets"
  ON public.payroll_tax_brackets FOR UPDATE TO public
  USING (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'payroll'::public.company_member_role]
  ))
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'payroll'::public.company_member_role]
  ));
CREATE POLICY "payroll roles delete tax brackets"
  ON public.payroll_tax_brackets FOR DELETE TO public
  USING (public.is_company_member(company_id) AND public.get_company_role(company_id) = ANY (
    ARRAY['owner'::public.company_member_role,'admin'::public.company_member_role,'payroll'::public.company_member_role]
  ));

-- PAYSLIP CONTRIBUTIONS: generated only by create_pay_run_atomic (service role).
-- Preserve the pre-existing SELECT policy; do not add authenticated write policies.
DROP POLICY IF EXISTS "hr roles write payslip_contributions" ON public.payslip_contributions;
-- PAYSLIP LINE ITEMS: generated only by create_pay_run_atomic (service role).
-- Preserve the pre-existing SELECT policy; do not add authenticated write policies.
DROP POLICY IF EXISTS "hr roles write payslip_line_items" ON public.payslip_line_items;
-- PAYSLIPS: generated only by create_pay_run_atomic (service role).
-- Preserve the pre-existing SELECT policy; do not add authenticated write policies.
DROP POLICY IF EXISTS "hr roles write payslips" ON public.payslips;
-- ROLE PERMISSIONS: preserve global/company member reads and admin management.
DROP POLICY IF EXISTS "role_permissions managed by admins" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions readable" ON public.role_permissions;
CREATE POLICY "members or admins read role permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND ((r.company_id IS NULL) OR public.is_company_member(r.company_id) OR public.is_company_admin(r.company_id))
    )
  );
CREATE POLICY "company admins insert role permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.company_id IS NOT NULL AND public.is_company_admin(r.company_id))
  );
CREATE POLICY "company admins update role permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.company_id IS NOT NULL AND public.is_company_admin(r.company_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.company_id IS NOT NULL AND public.is_company_admin(r.company_id))
  );
CREATE POLICY "company admins delete role permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.company_id IS NOT NULL AND public.is_company_admin(r.company_id))
  );

-- ROLES: preserve global role visibility and company member visibility.
DROP POLICY IF EXISTS "roles managed by admins" ON public.roles;
DROP POLICY IF EXISTS "roles readable by members" ON public.roles;
CREATE POLICY "members or admins read roles"
  ON public.roles FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.is_company_member(company_id) OR public.is_company_admin(company_id));
CREATE POLICY "company admins insert roles"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK (company_id IS NOT NULL AND public.is_company_admin(company_id));
CREATE POLICY "company admins update roles"
  ON public.roles FOR UPDATE TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_admin(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.is_company_admin(company_id));
CREATE POLICY "company admins delete roles"
  ON public.roles FOR DELETE TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_admin(company_id));

-- TAX RETURNS UPDATE: administrators may update any status; non-viewer
-- members may update draft rows only.
DROP POLICY IF EXISTS "company admins update any status" ON public.tax_returns;
DROP POLICY IF EXISTS "company members update draft" ON public.tax_returns;
CREATE POLICY "company admins or members update tax returns"
  ON public.tax_returns FOR UPDATE TO public
  USING (
    public.is_company_admin(company_id)
    OR (
      public.is_company_member(company_id)
      AND public.get_company_role(company_id) <> 'viewer'::public.company_member_role
      AND status = 'draft'
    )
  )
  WITH CHECK (
    public.is_company_admin(company_id)
    OR (
      public.is_company_member(company_id)
      AND public.get_company_role(company_id) <> 'viewer'::public.company_member_role
      AND status = 'draft'
    )
  );
