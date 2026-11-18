-- Isolated PostgreSQL fixture for the atomic payroll-generation RPC.
-- Executed only in a fresh GitHub Actions PostgreSQL database.
CREATE ROLE service_role;

CREATE TYPE public.company_member_role AS ENUM (
  'owner','admin','accountant','hr','payroll','viewer'
);

CREATE TABLE public.companies (
  id uuid PRIMARY KEY,
  currency text NOT NULL
);

CREATE TABLE public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  role public.company_member_role NOT NULL,
  status text NOT NULL,
  PRIMARY KEY (company_id,user_id)
);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  salary numeric NOT NULL,
  salary_currency text NOT NULL,
  employment_status text NOT NULL
);

CREATE TABLE public.pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  status text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  currency text NOT NULL,
  total_gross numeric NOT NULL,
  total_employee_deductions numeric NOT NULL,
  total_net numeric NOT NULL,
  total_employer_contributions numeric NOT NULL,
  total_employer_cost numeric NOT NULL
);

CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  base_salary numeric NOT NULL,
  gross_salary numeric NOT NULL,
  taxable_income numeric NOT NULL,
  paye numeric NOT NULL,
  total_employee_deductions numeric NOT NULL,
  net_pay numeric NOT NULL,
  total_employer_contributions numeric NOT NULL,
  total_employer_cost numeric NOT NULL,
  currency text NOT NULL
);

CREATE TABLE public.payslip_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES public.payslips(id),
  name text NOT NULL,
  employee_amount numeric NOT NULL,
  employer_amount numeric NOT NULL
);

CREATE TABLE public.payslip_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES public.payslips(id),
  kind text NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL
);

CREATE FUNCTION public.company_has_feature(p_company_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql STABLE
AS 'SELECT current_setting(''test.payroll_enabled'', true) = ''true''';

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, UPDATE ON public.company_members TO service_role;
GRANT SELECT ON public.companies, public.employees, public.pay_runs,
  public.payslips, public.payslip_contributions, public.payslip_line_items
  TO service_role;
