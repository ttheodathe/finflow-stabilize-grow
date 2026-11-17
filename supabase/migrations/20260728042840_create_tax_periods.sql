create table public.tax_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_setting_id uuid not null references public.company_tax_settings(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'filed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tax_setting_id, period_start, period_end)
);

create index idx_tax_periods_company on public.tax_periods(company_id);
create index idx_tax_periods_due_date on public.tax_periods(due_date);

create trigger trg_tax_periods_updated before update on public.tax_periods
  for each row execute function public.set_updated_at();

alter table public.tax_periods enable row level security;

create policy "company members select" on public.tax_periods for select
  using (is_company_member(company_id));
create policy "company members insert" on public.tax_periods for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.tax_periods for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.tax_periods for delete
  using (is_company_admin(company_id));
