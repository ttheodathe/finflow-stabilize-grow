-- Enforce the Payroll plan entitlement on every direct write surface.
-- Existing historical rows remain readable and can be deleted for cleanup;
-- creating or changing payroll configuration and payslip records is gated.

-- This trigger function uses schema-qualified objects; an empty search path is safe.
ALTER FUNCTION public.enforce_plan_feature() SET search_path = '';
DROP TRIGGER IF EXISTS trg_enforce_payroll_tax_brackets_feature
  ON public.payroll_tax_brackets;
CREATE TRIGGER trg_enforce_payroll_tax_brackets_feature
BEFORE INSERT OR UPDATE ON public.payroll_tax_brackets
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('payroll');

DROP TRIGGER IF EXISTS trg_enforce_payroll_statutory_contributions_feature
  ON public.payroll_statutory_contributions;
CREATE TRIGGER trg_enforce_payroll_statutory_contributions_feature
BEFORE INSERT OR UPDATE ON public.payroll_statutory_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('payroll');

DROP TRIGGER IF EXISTS trg_enforce_payslips_feature
  ON public.payslips;
CREATE TRIGGER trg_enforce_payslips_feature
BEFORE INSERT OR UPDATE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('payroll');

CREATE OR REPLACE FUNCTION public.enforce_payslip_child_payroll_feature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT p.company_id
    INTO v_company_id
    FROM public.payslips p
   WHERE p.id = NEW.payslip_id;

  IF NOT FOUND OR NOT public.company_has_feature(v_company_id, 'payroll') THEN
    RAISE EXCEPTION 'feature_locked: payroll requires an active eligible plan'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_payslip_child_payroll_feature()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_payslip_contributions_feature
  ON public.payslip_contributions;
CREATE TRIGGER trg_enforce_payslip_contributions_feature
BEFORE INSERT OR UPDATE ON public.payslip_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_payslip_child_payroll_feature();

DROP TRIGGER IF EXISTS trg_enforce_payslip_line_items_feature
  ON public.payslip_line_items;
CREATE TRIGGER trg_enforce_payslip_line_items_feature
BEFORE INSERT OR UPDATE ON public.payslip_line_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_payslip_child_payroll_feature();
