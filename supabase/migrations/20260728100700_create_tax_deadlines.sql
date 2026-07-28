create table public.tax_deadlines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_setting_id uuid references public.company_tax_settings(id) on delete cascade,
  title text not null,
  tax_type text not null default 'vat',
  due_date date not null,
  reminder_days_before integer not null default 7,
  is_recurring boolean not null default true,
  status text not null default 'upcoming' check (status in ('upcoming', 'due_soon', 'overdue', 'completed')),
  tax_return_id uuid references public.tax_returns(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tax_deadlines_company on public.tax_deadlines(company_id);
create index idx_tax_deadlines_due_date on public.tax_deadlines(due_date);

create trigger trg_tax_deadlines_updated before update on public.tax_deadlines
  for each row execute function public.set_updated_at();

alter table public.tax_deadlines enable row level security;

create policy "company members select" on public.tax_deadlines for select
  using (is_company_member(company_id));
create policy "company members insert" on public.tax_deadlines for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.tax_deadlines for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.tax_deadlines for delete
  using (is_company_admin(company_id));
