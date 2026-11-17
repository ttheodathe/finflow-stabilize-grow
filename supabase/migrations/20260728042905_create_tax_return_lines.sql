create table public.tax_return_lines (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  source_type text not null check (source_type in ('invoice', 'expense', 'bill', 'manual')),
  source_id uuid,
  account_id uuid references public.accounts(id) on delete set null,
  description text,
  taxable_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  direction text not null check (direction in ('output', 'input')),
  created_at timestamptz not null default now()
);

create index idx_tax_return_lines_return on public.tax_return_lines(return_id);
create index idx_tax_return_lines_company on public.tax_return_lines(company_id);
create index idx_tax_return_lines_source on public.tax_return_lines(source_type, source_id);

alter table public.tax_return_lines enable row level security;

create policy "company members select" on public.tax_return_lines for select
  using (is_company_member(company_id));
create policy "company members insert" on public.tax_return_lines for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.tax_return_lines for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.tax_return_lines for delete
  using (is_company_admin(company_id));
