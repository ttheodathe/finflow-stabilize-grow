create table public.tax_payments (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  paid_date date not null default current_date,
  method text not null default 'bank_transfer',
  reference text,
  source_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tax_payments_return on public.tax_payments(return_id);
create index idx_tax_payments_company on public.tax_payments(company_id);

create trigger trg_tax_payments_updated before update on public.tax_payments
  for each row execute function public.set_updated_at();

alter table public.tax_payments enable row level security;

create policy "company members select" on public.tax_payments for select
  using (is_company_member(company_id));
create policy "company members insert" on public.tax_payments for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.tax_payments for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.tax_payments for delete
  using (is_company_admin(company_id));
