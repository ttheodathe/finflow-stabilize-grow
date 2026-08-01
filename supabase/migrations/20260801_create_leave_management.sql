-- Already applied directly to your live Supabase project (zjaamxvqjiymgfujrtjm)
-- via the Supabase MCP connector. Copy this into
-- supabase/migrations/20260801_create_leave_management.sql in your repo
-- so local migration history stays in sync — do not re-run it.
--
-- ============================================================
-- Leave Management, built on the Employees/Departments foundation.
-- Same is_company_member/hr-role RLS pattern as employees/departments.
-- ============================================================

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  annual_allocation_days numeric(6,2) not null default 0,
  is_paid boolean not null default true,
  color text not null default '#6366f1',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index leave_types_company_name_uidx on public.leave_types(company_id, name);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,

  start_date date not null,
  end_date date not null,
  days_requested numeric(6,2) not null,
  reason text,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leave_requests_dates_valid check (end_date >= start_date),
  constraint leave_requests_days_positive check (days_requested > 0)
);

create index idx_leave_requests_company on public.leave_requests(company_id);
create index idx_leave_requests_employee on public.leave_requests(employee_id, status);
create index idx_leave_requests_type on public.leave_requests(leave_type_id);
create index idx_leave_requests_dates on public.leave_requests(company_id, start_date, end_date);

create trigger trg_leave_types_updated before update on public.leave_types
  for each row execute function public.set_updated_at();
create trigger trg_leave_requests_updated before update on public.leave_requests
  for each row execute function public.set_updated_at();

alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;

create policy "hr roles select leave_types" on public.leave_types for select
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles insert leave_types" on public.leave_types for insert
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles update leave_types" on public.leave_types for update
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'))
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "company admins delete leave_types" on public.leave_types for delete
  using (is_company_admin(company_id));

create policy "hr roles select leave_requests" on public.leave_requests for select
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles insert leave_requests" on public.leave_requests for insert
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "hr roles update leave_requests" on public.leave_requests for update
  using (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'))
  with check (is_company_member(company_id) and get_company_role(company_id) in ('owner','admin','hr','payroll'));
create policy "company admins delete leave_requests" on public.leave_requests for delete
  using (is_company_admin(company_id));

comment on table public.leave_types is 'People Platform: configurable leave categories (Annual, Sick, etc.) with annual allocation.';
comment on table public.leave_requests is 'People Platform: leave requests with approval workflow. Balance = leave_types.annual_allocation_days minus sum of approved days in the current year, computed on read rather than stored, to avoid drift.';
