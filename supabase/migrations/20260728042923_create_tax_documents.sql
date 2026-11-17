create table public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null check (doc_type in ('filing_export', 'receipt', 'confirmation', 'supporting')),
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_tax_documents_return on public.tax_documents(return_id);
create index idx_tax_documents_company on public.tax_documents(company_id);

alter table public.tax_documents enable row level security;

create policy "company members select" on public.tax_documents for select
  using (is_company_member(company_id));
create policy "company members insert" on public.tax_documents for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.tax_documents for delete
  using (is_company_admin(company_id));

-- Storage bucket for tax filing documents, private with signed URLs
-- (mirrors the company-logos bucket pattern already used in this project).
-- Upload paths must be structured as {company_id}/{return_id}/{filename}
-- so storage.foldername(name)[1] resolves to the company_id for RLS.
insert into storage.buckets (id, name, public)
values ('tax-documents', 'tax-documents', false)
on conflict (id) do nothing;

create policy "company members read tax documents"
  on storage.objects for select
  using (
    bucket_id = 'tax-documents'
    and is_company_member((storage.foldername(name))[1]::uuid)
  );

create policy "company members upload tax documents"
  on storage.objects for insert
  with check (
    bucket_id = 'tax-documents'
    and is_company_member((storage.foldername(name))[1]::uuid)
    and get_company_role((storage.foldername(name))[1]::uuid) <> 'viewer'
  );

create policy "company admins delete tax documents"
  on storage.objects for delete
  using (
    bucket_id = 'tax-documents'
    and is_company_admin((storage.foldername(name))[1]::uuid)
  );
