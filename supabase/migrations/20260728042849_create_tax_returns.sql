create table public.tax_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_period_id uuid not null references public.tax_periods(id) on delete cascade,
  tax_type text not null default 'vat',
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'submitted', 'accepted', 'rejected')),
  taxable_sales numeric(14,2) not null default 0,
  taxable_purchases numeric(14,2) not null default 0,
  output_tax numeric(14,2) not null default 0,
  input_tax numeric(14,2) not null default 0,
  net_tax_due numeric(14,2) not null default 0,
  reference_number text,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tax_returns_company on public.tax_returns(company_id);
create index idx_tax_returns_period on public.tax_returns(tax_period_id);
create index idx_tax_returns_status on public.tax_returns(status);

create trigger trg_tax_returns_updated before update on public.tax_returns
  for each row execute function public.set_updated_at();

alter table public.tax_returns enable row level security;

create policy "company members select" on public.tax_returns for select
  using (is_company_member(company_id));
create policy "company members insert" on public.tax_returns for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update draft" on public.tax_returns for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer' and status = 'draft')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.tax_returns for delete
  using (is_company_admin(company_id) and status = 'draft');

-- Admins can update returns in any status (e.g. recording the authority's
-- accepted/rejected response after submission) - regular members can only
-- edit while still draft (see policy above).
create policy "company admins update any status" on public.tax_returns for update
  using (is_company_admin(company_id))
  with check (is_company_admin(company_id));
