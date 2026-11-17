-- Already applied directly to your live Supabase project (zjaamxvqjiymgfujrtjm)
-- via the Supabase MCP connector. Copy this into
-- supabase/migrations/20260731_create_employees_departments_foundation.sql
-- in your repo so local migration history stays in sync — do not re-run it.
--
-- ============================================================
-- People Platform foundation: Departments + Employees.
-- Mirrors the is_company_member/is_company_admin RLS pattern
-- already used across accounts, items, documents, etc.
-- ============================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  cost_center_account_id uuid references public.accounts(id) on delete set null,
  manager_id uuid, -- FK added below, after employees exists (circular ref)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  employee_number text,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  national_id text,
  address text,

  department_id uuid references public.departments(id) on delete set null,
  job_title text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'intern')),
  employment_status text not null default 'active'
    check (employment_status in ('active', 'on_leave', 'terminated')),
  hire_date date not null default current_date,
  termination_date date,
  manager_id uuid references public.employees(id) on delete set null,

  salary numeric(14,2) not null default 0,
  salary_currency text not null default 'USD',
  pay_frequency text not null default 'monthly'
    check (pay_frequency in ('monthly', 'biweekly', 'weekly')),

  linked_user_id uuid references auth.users(id) on delete set null,

  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint employees_termination_after_hire
    check (termination_date is null or termination_date >= hire_date)
);

alter table public.departments
  add constraint departments_manager_id_fkey
  foreign key (manager_id) references public.employees(id) on delete set null;

create unique index employees_company_number_uidx
  on public.employees(company_id, employee_number)
  where employee_number is not null and employee_number <> '';

create index idx_employees_company on public.employees(company_id);
create index idx_employees_department on public.employees(company_id, department_id);
create index idx_employees_status on public.employees(company_id, employment_status);
create index idx_employees_manager on public.employees(manager_id);
create index idx_departments_company on public.departments(company_id);

create trigger trg_departments_updated before update on public.departments
  for each row execute function public.set_updated_at();
create trigger trg_employees_updated before update on public.employees
  for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.employees enable row level security;

-- Initial policies (superseded by the follow-up migration below, which
-- restricts these to hr-relevant roles). Included here for a complete,
-- runnable history.
create policy "company members select departments" on public.departments for select
  using (is_company_member(company_id));
create policy "company members insert departments" on public.departments for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update departments" on public.departments for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete departments" on public.departments for delete
  using (is_company_admin(company_id));

create policy "company members select employees" on public.employees for select
  using (is_company_member(company_id));
create policy "company members insert employees" on public.employees for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update employees" on public.employees for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete employees" on public.employees for delete
  using (is_company_admin(company_id));

comment on table public.departments is 'People Platform: organizational departments/cost centers.';
comment on table public.employees is 'People Platform: employee master records. Separate from company_members (app-access accounts) — most employees will never have a FinFlowTrack login.';


-- ============================================================
-- Follow-up migration: restrict employees/departments to HR-relevant
-- roles instead of "any company member". company_member_role already
-- included 'hr' and 'payroll' values that nothing referenced yet.
-- ============================================================

drop policy "company members select departments" on public.departments;
drop policy "company members insert departments" on public.departments;
drop policy "company members update departments" on public.departments;

drop policy "company members select employees" on public.employees;
drop policy "company members insert employees" on public.employees;
drop policy "company members update employees" on public.employees;

create policy "hr roles select departments" on public.departments for select
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles insert departments" on public.departments for insert
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles update departments" on public.departments for update
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'))
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));

create policy "hr roles select employees" on public.employees for select
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles insert employees" on public.employees for insert
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles update employees" on public.employees for update
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'))
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
