-- ============================================================
-- Inventory Intelligence Platform — Phase 1: core data model
--
-- Adds the foundation every later inventory phase (receiving,
-- transfers, barcode/QR, batch/serial, forecasting, ...) builds on:
--   - brands
--   - units_of_measure (with system-wide defaults)
--   - warehouses
--   - warehouse_locations (self-referencing zone/aisle/shelf/bin tree)
--   - inventory_balances (per item x warehouse x location stock)
--   - extends public.items with the product/inventory attributes
--     from the spec (brand, uom, barcode, reorder rules, accounting
--     mapping, and a self-referencing parent_item_id for variants)
--   - extends public.stock_movements with warehouse/location
--
-- Design decision — variants live on `items`, not a separate table:
-- `items.id` is already the FK target for invoice_items, bill_items,
-- estimate_items, purchase_order_items and stock_movements. A
-- separate `product_variants` table would either duplicate all of
-- that plumbing or force every consumer to branch on "item vs
-- variant". Instead, a variant is just another row in `items` with
-- `parent_item_id` set and `variant_attributes` describing what
-- differs (e.g. {"Size":"L","Color":"Red"}) — it gets full pricing,
-- tax, barcode, and inventory tracking for free, and every existing
-- line-item table can reference it today with zero changes.
--
-- Design decision — items.stock_quantity stays authoritative for now:
-- `apply_invoice_stock()` (existing trigger-driven function) still
-- writes to items.stock_quantity on invoice payment. This migration
-- adds a trigger that mirrors that write into inventory_balances at
-- the item's default warehouse, so the new warehouse-aware UI has
-- real data immediately without touching the sales/invoice path.
-- A later "stock movements v2" slice flips this: warehouse-scoped
-- movements become the write path and items.stock_quantity becomes
-- a computed rollup (SUM across warehouses) instead.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. brands
-- ---------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);
create index idx_brands_company on public.brands(company_id);
create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();

alter table public.brands enable row level security;
create policy "company members select" on public.brands for select
  using (is_company_member(company_id));
create policy "company members insert" on public.brands for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.brands for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.brands for delete
  using (is_company_admin(company_id));

-- ---------------------------------------------------------------
-- 2. units_of_measure
-- company_id null = system-wide default unit, readable by everyone,
-- writable only by service_role. Companies can add their own on top.
-- base_unit_id + conversion_factor lets "box of 12" convert to "unit".
-- ---------------------------------------------------------------
create table public.units_of_measure (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null default 'count'
    check (category in ('count','weight','volume','length')),
  base_unit_id uuid references public.units_of_measure(id) on delete set null,
  conversion_factor numeric(18,6) not null default 1,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uom_code_company_uniq
  on public.units_of_measure (lower(code), coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index idx_uom_company on public.units_of_measure(company_id);
create trigger trg_uom_updated before update on public.units_of_measure
  for each row execute function public.set_updated_at();

alter table public.units_of_measure enable row level security;
create policy "readable by authenticated" on public.units_of_measure for select to authenticated
  using (company_id is null or is_company_member(company_id));
create policy "company members insert" on public.units_of_measure for insert
  with check (company_id is not null and is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.units_of_measure for update
  using (company_id is not null and is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (company_id is not null and is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.units_of_measure for delete
  using (company_id is not null and is_company_admin(company_id));

insert into public.units_of_measure (code, name, category, is_system) values
  ('unit', 'Unit',      'count',  true),
  ('box',  'Box',       'count',  true),
  ('pack', 'Pack',      'count',  true),
  ('dozen','Dozen',     'count',  true),
  ('kg',   'Kilogram',  'weight', true),
  ('g',    'Gram',      'weight', true),
  ('lb',   'Pound',     'weight', true),
  ('l',    'Liter',     'volume', true),
  ('ml',   'Milliliter','volume', true),
  ('m',    'Meter',     'length', true),
  ('cm',   'Centimeter','length', true);

-- ---------------------------------------------------------------
-- 3. warehouses
-- ---------------------------------------------------------------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  address text,
  city text,
  country text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
create index idx_warehouses_company on public.warehouses(company_id);
-- only one default warehouse per company
create unique index warehouses_one_default_per_company
  on public.warehouses(company_id) where is_default;
create trigger trg_warehouses_updated before update on public.warehouses
  for each row execute function public.set_updated_at();

alter table public.warehouses enable row level security;
create policy "company members select" on public.warehouses for select
  using (is_company_member(company_id));
create policy "company members insert" on public.warehouses for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.warehouses for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.warehouses for delete
  using (is_company_admin(company_id));

-- ---------------------------------------------------------------
-- 4. warehouse_locations
-- Self-referencing tree: warehouse -> zone -> aisle -> shelf -> bin.
-- One table (rather than 4) keeps the hierarchy extensible without
-- new tables/migrations if a company only wants zones, or wants a
-- 6th level; depth is enforced in the application layer, not SQL.
-- ---------------------------------------------------------------
create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  parent_location_id uuid references public.warehouse_locations(id) on delete cascade,
  location_type text not null default 'bin'
    check (location_type in ('zone','aisle','shelf','bin')),
  code text not null,
  name text,
  barcode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, parent_location_id, code)
);
create index idx_wloc_company on public.warehouse_locations(company_id);
create index idx_wloc_warehouse on public.warehouse_locations(warehouse_id);
create index idx_wloc_parent on public.warehouse_locations(parent_location_id);
create trigger trg_wloc_updated before update on public.warehouse_locations
  for each row execute function public.set_updated_at();

alter table public.warehouse_locations enable row level security;
create policy "company members select" on public.warehouse_locations for select
  using (is_company_member(company_id));
create policy "company members insert" on public.warehouse_locations for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.warehouse_locations for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.warehouse_locations for delete
  using (is_company_admin(company_id));

-- ---------------------------------------------------------------
-- 5. extend items — product/inventory attributes + variants
-- ---------------------------------------------------------------
alter table public.items
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  add column if not exists uom_id uuid references public.units_of_measure(id) on delete set null,
  add column if not exists barcode text,
  add column if not exists qr_code_value text,
  add column if not exists reorder_level numeric(14,3) not null default 0,
  add column if not exists safety_stock numeric(14,3) not null default 0,
  add column if not exists max_stock numeric(14,3),
  add column if not exists lead_time_days integer not null default 0,
  add column if not exists default_warehouse_id uuid references public.warehouses(id) on delete set null,
  add column if not exists inventory_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists cogs_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists revenue_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists parent_item_id uuid references public.items(id) on delete cascade,
  add column if not exists variant_attributes jsonb not null default '{}'::jsonb;

create index if not exists idx_items_parent on public.items(parent_item_id);
create index if not exists idx_items_brand on public.items(brand_id);
create index if not exists idx_items_default_warehouse on public.items(default_warehouse_id);
-- barcode unique per company when set
create unique index if not exists items_barcode_company_uniq
  on public.items(company_id, barcode) where barcode is not null;

-- ---------------------------------------------------------------
-- 6. inventory_balances — the per-warehouse stock ledger
-- ---------------------------------------------------------------
create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  location_id uuid references public.warehouse_locations(id) on delete set null,
  quantity_on_hand numeric(14,3) not null default 0,
  quantity_reserved numeric(14,3) not null default 0,
  quantity_incoming numeric(14,3) not null default 0,
  quantity_available numeric(14,3) generated always as (quantity_on_hand - quantity_reserved) stored,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_inv_bal_company on public.inventory_balances(company_id);
create index idx_inv_bal_item on public.inventory_balances(item_id);
create index idx_inv_bal_warehouse on public.inventory_balances(warehouse_id);
create unique index inv_bal_uniq_with_location
  on public.inventory_balances(item_id, warehouse_id, location_id) where location_id is not null;
create unique index inv_bal_uniq_no_location
  on public.inventory_balances(item_id, warehouse_id) where location_id is null;
create trigger trg_inv_bal_updated before update on public.inventory_balances
  for each row execute function public.set_updated_at();

alter table public.inventory_balances enable row level security;
create policy "company members select" on public.inventory_balances for select
  using (is_company_member(company_id));
create policy "company members insert" on public.inventory_balances for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update" on public.inventory_balances for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete" on public.inventory_balances for delete
  using (is_company_admin(company_id));

-- ---------------------------------------------------------------
-- 7. extend stock_movements with warehouse/location (nullable —
-- existing invoice-driven rows stay valid with no backfill needed)
-- ---------------------------------------------------------------
alter table public.stock_movements
  add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null,
  add column if not exists location_id uuid references public.warehouse_locations(id) on delete set null;
create index if not exists idx_stock_movements_warehouse on public.stock_movements(warehouse_id);

-- ---------------------------------------------------------------
-- 8. auto-provision a default warehouse for every company
-- ---------------------------------------------------------------
create or replace function public.provision_default_warehouse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.warehouses (company_id, code, name, is_default, is_active)
  values (new.id, 'MAIN', 'Main Warehouse', true, true);
  return new;
end;
$$;

create trigger trg_companies_provision_warehouse
  after insert on public.companies
  for each row execute function public.provision_default_warehouse();

-- ---------------------------------------------------------------
-- 9. keep inventory_balances in sync with items.stock_quantity
-- (bridging design — see header comment)
-- ---------------------------------------------------------------
create or replace function public.sync_item_stock_to_default_warehouse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_warehouse uuid;
begin
  if new.track_inventory is not true then
    return new;
  end if;

  target_warehouse := new.default_warehouse_id;
  if target_warehouse is null then
    select id into target_warehouse from public.warehouses
      where company_id = new.company_id and is_default
      limit 1;
  end if;
  if target_warehouse is null then
    return new;
  end if;

  insert into public.inventory_balances (company_id, item_id, warehouse_id, quantity_on_hand)
  values (new.company_id, new.id, target_warehouse, new.stock_quantity)
  on conflict (item_id, warehouse_id) where location_id is null
  do update set quantity_on_hand = excluded.quantity_on_hand, updated_at = now();

  return new;
end;
$$;

create trigger trg_items_sync_inventory_balance
  after insert or update of stock_quantity, track_inventory, default_warehouse_id on public.items
  for each row execute function public.sync_item_stock_to_default_warehouse();

-- ---------------------------------------------------------------
-- 10. backfill for existing companies/items created before this
-- migration (new companies get a warehouse from the trigger above)
-- ---------------------------------------------------------------
insert into public.warehouses (company_id, code, name, is_default, is_active)
select c.id, 'MAIN', 'Main Warehouse', true, true
from public.companies c
where not exists (select 1 from public.warehouses w where w.company_id = c.id);

insert into public.inventory_balances (company_id, item_id, warehouse_id, quantity_on_hand)
select i.company_id, i.id, w.id, i.stock_quantity
from public.items i
join public.warehouses w on w.company_id = i.company_id and w.is_default
where i.track_inventory = true
on conflict (item_id, warehouse_id) where location_id is null do nothing;
