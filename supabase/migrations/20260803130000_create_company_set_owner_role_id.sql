-- Second layer of schema drift on the same code path: company_members now
-- has a NOT NULL role_id (FK -> roles.id), added by the People
-- Platform/RBAC work, but create_company() only ever set the legacy
-- `role` enum column and was never updated to also populate role_id.
-- Look up the system "owner" role (roles.company_id is null, key='owner',
-- is_system=true) and populate role_id when inserting the owner membership.
create or replace function public.create_company(
  p_name text,
  p_email text default null,
  p_address text default null,
  p_currency text default 'USD',
  p_organization_id uuid default null,
  p_phone text default null,
  p_website text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country text default null,
  p_tax_number text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_plan record;
  v_owned_count int;
  v_new_company public.companies;
  v_owner_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Company name is required';
  end if;

  -- Self-heal: ensure a profiles row exists for this user before anything
  -- that FKs to it (company_members.user_id -> profiles.id).
  insert into public.profiles (id, email)
  select auth.uid(), u.email
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  -- system "owner" role, shared across all companies (company_id is null)
  select id into v_owner_role_id
  from public.roles
  where key = 'owner' and company_id is null and is_system = true
  limit 1;

  if v_owner_role_id is null then
    raise exception 'System owner role is not configured';
  end if;

  if p_organization_id is not null then
    v_org_id := p_organization_id;
    if not exists (select 1 from public.organizations where id = v_org_id and owner_id = auth.uid()) then
      raise exception 'You do not own this organization';
    end if;
  else
    select id into v_org_id from public.organizations where owner_id = auth.uid() limit 1;
    if v_org_id is null then
      insert into public.organizations (name, owner_id)
      values (p_name, auth.uid())
      returning id into v_org_id;

      insert into public.organization_members (organization_id, user_id, role, status, joined_at)
      values (v_org_id, auth.uid(), 'owner', 'active', now());
    end if;
  end if;

  select sp.max_companies, sp.max_users into v_plan
  from public.subscriptions s
  join public.subscription_plans sp on sp.id = s.plan_id
  where s.user_id = auth.uid()
  limit 1;

  if v_plan is null then
    select max_companies, max_users into v_plan from public.subscription_plans where key = 'free';
  end if;

  select count(*) into v_owned_count
  from public.companies c
  join public.company_members cm on cm.company_id = c.id
  where cm.user_id = auth.uid() and cm.role = 'owner';

  if v_owned_count >= v_plan.max_companies then
    raise exception 'company_limit_reached: your plan allows up to % companies', v_plan.max_companies
      using errcode = 'P0001';
  end if;

  insert into public.companies (
    user_id, name, email, address, currency, organization_id,
    phone, website, city, state, postal_code, country, tax_number
  ) values (
    auth.uid(), trim(p_name), p_email, p_address, coalesce(p_currency, 'USD'), v_org_id,
    p_phone, p_website, p_city, p_state, p_postal_code, p_country, p_tax_number
  )
  returning * into v_new_company;

  -- owner membership (role_id now populated to satisfy the NOT NULL/FK)
  insert into public.company_members (company_id, user_id, role, role_id, status, joined_at)
  values (v_new_company.id, auth.uid(), 'owner', v_owner_role_id, 'active', now());

  insert into public.company_settings (company_id, timezone)
  values (v_new_company.id, 'UTC');

  insert into public.company_tax_settings (company_id, name, rate, is_default)
  values (v_new_company.id, 'No Tax', 0, true);

  insert into public.accounts (user_id, company_id, code, name, type, is_system, is_active)
  values
    (auth.uid(), v_new_company.id, '1000', 'Cash', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1010', 'Bank account', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1100', 'Accounts receivable', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1200', 'Inventory', 'asset', true, true),
    (auth.uid(), v_new_company.id, '1500', 'Fixed assets', 'asset', true, true),
    (auth.uid(), v_new_company.id, '2000', 'Accounts payable', 'liability', true, true),
    (auth.uid(), v_new_company.id, '2100', 'Sales tax payable', 'liability', true, true),
    (auth.uid(), v_new_company.id, '2200', 'Credit card', 'liability', true, true),
    (auth.uid(), v_new_company.id, '2500', 'Loans payable', 'liability', true, true),
    (auth.uid(), v_new_company.id, '3000', 'Owner equity', 'equity', true, true),
    (auth.uid(), v_new_company.id, '3100', 'Retained earnings', 'equity', true, true),
    (auth.uid(), v_new_company.id, '3200', 'Owner draws', 'equity', true, true),
    (auth.uid(), v_new_company.id, '4000', 'Sales revenue', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '4100', 'Service revenue', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '4900', 'Other income', 'revenue', true, true),
    (auth.uid(), v_new_company.id, '5000', 'Cost of goods sold', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6000', 'Rent', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6100', 'Utilities', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6200', 'Salaries and wages', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6300', 'Office supplies', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6400', 'Software and subscriptions', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6500', 'Marketing and advertising', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6600', 'Travel', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6700', 'Meals and entertainment', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6800', 'Professional fees', 'expense', true, true),
    (auth.uid(), v_new_company.id, '6900', 'Bank fees', 'expense', true, true),
    (auth.uid(), v_new_company.id, '7000', 'Depreciation', 'expense', true, true),
    (auth.uid(), v_new_company.id, '7900', 'Other expenses', 'expense', true, true);

  insert into public.audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
  values (v_new_company.id, auth.uid(), 'company.created', 'company', v_new_company.id,
    jsonb_build_object('name', v_new_company.name));

  return v_new_company;
end;
$$;

grant execute on function public.create_company(text,text,text,text,uuid,text,text,text,text,text,text,text) to authenticated;
