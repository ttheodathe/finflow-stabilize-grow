-- ============================================================
-- Inventory Intelligence Platform — Phase 2: stock movements v2
--
-- Makes public.inventory_balances the single source of truth for
-- stock, and public.record_stock_movement() the single write path
-- to it. Everything else (receiving, dispatch, transfers,
-- adjustments, and the existing invoice flow) goes through it, so
-- balances can never drift from the movement ledger.
--
-- Supersedes the slice-1 bridging design: previously items.stock_quantity
-- was authoritative and a trigger mirrored it into inventory_balances.
-- This migration flips that: inventory_balances is now authoritative,
-- and items.stock_quantity becomes a denormalized rollup kept in sync
-- by trigger, purely for the places in the app that still read it
-- directly (e.g. simple product list badges).
--
-- Accounting: receiving and dispatch (and adjustments with a cost
-- impact) each post a balanced journal entry using the item's
-- inventory_account_id / cogs_account_id from slice 1, following the
-- codebase's existing "one journal_entries row per source event,
-- delete-and-reinsert on reversal" convention (see billing/tax
-- migrations). Transfers between warehouses of the same company do
-- not post accounting entries — no valuation change, just relocation.
-- ============================================================

-- ---------------------------------------------------------------
-- 0. drop the slice-1 bridging trigger (items -> inventory_balances).
-- The direction flips permanently as of this migration.
-- ---------------------------------------------------------------
drop trigger if exists trg_items_sync_inventory_balance on public.items;
drop function if exists public.sync_item_stock_to_default_warehouse();

-- ---------------------------------------------------------------
-- 1. standardize stock_movements.reason with a check constraint,
-- covering the legacy invoice reasons plus the new movement types.
-- warehouse_id/location_id already added in slice 1 (nullable).
-- ---------------------------------------------------------------
alter table public.stock_movements
  add column if not exists reference_type text,
  add column if not exists reference_id uuid,
  add column if not exists unit_cost numeric(14,4);

alter table public.stock_movements drop constraint if exists stock_movements_reason_check;
alter table public.stock_movements add constraint stock_movements_reason_check
  check (reason in (
    'invoice_paid', 'invoice_reversed', 'invoice_deleted',       -- legacy / sales dispatch
    'receipt', 'dispatch',
    'transfer_out', 'transfer_in',
    'cycle_count', 'damaged', 'lost', 'found', 'correction',      -- adjustment reasons
    'return_in', 'return_out'
  ));

create index if not exists idx_stock_movements_reference
  on public.stock_movements(reference_type, reference_id);

-- ---------------------------------------------------------------
-- 2. purchase_order_items — track partial receiving
-- ---------------------------------------------------------------
alter table public.purchase_order_items
  add column if not exists received_quantity numeric(14,3) not null default 0;

-- ---------------------------------------------------------------
-- 3. core primitive — the ONLY function allowed to change
-- inventory_balances.quantity_on_hand. Pure stock movement, no
-- accounting; callers that need accounting call this and then
-- public.post_inventory_journal_entry() themselves (see the
-- receive_stock / dispatch_stock / adjust_stock wrappers below).
-- ---------------------------------------------------------------
create or replace function public.record_stock_movement(
  p_company_id uuid,
  p_user_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity_change numeric,        -- signed: positive = in, negative = out
  p_reason text,
  p_location_id uuid default null,
  p_note text default null,
  p_invoice_id uuid default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_unit_cost numeric default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_movement public.stock_movements;
begin
  if not is_company_member(p_company_id) then
    raise exception 'not a member of this company';
  end if;

  if p_location_id is null then
    insert into public.inventory_balances (company_id, item_id, warehouse_id, location_id, quantity_on_hand)
    values (p_company_id, p_item_id, p_warehouse_id, null, p_quantity_change)
    on conflict (item_id, warehouse_id) where location_id is null
      do update set quantity_on_hand = inventory_balances.quantity_on_hand + p_quantity_change,
                    updated_at = now()
    returning quantity_on_hand into v_balance;
  else
    insert into public.inventory_balances (company_id, item_id, warehouse_id, location_id, quantity_on_hand)
    values (p_company_id, p_item_id, p_warehouse_id, p_location_id, p_quantity_change)
    on conflict (item_id, warehouse_id, location_id) where location_id is not null
      do update set quantity_on_hand = inventory_balances.quantity_on_hand + p_quantity_change,
                    updated_at = now()
    returning quantity_on_hand into v_balance;
  end if;

  insert into public.stock_movements (
    company_id, user_id, item_id, warehouse_id, location_id, invoice_id,
    quantity_change, balance_after, reason, note, reference_type, reference_id, unit_cost
  ) values (
    p_company_id, p_user_id, p_item_id, p_warehouse_id, p_location_id, p_invoice_id,
    p_quantity_change, v_balance, p_reason, p_note, p_reference_type, p_reference_id, p_unit_cost
  )
  returning * into v_movement;

  -- keep items.stock_quantity as a rollup for simple UI reads
  update public.items
     set stock_quantity = (
       select coalesce(sum(quantity_on_hand), 0)
       from public.inventory_balances
       where item_id = p_item_id
     )
   where id = p_item_id;

  return v_movement;
end;
$$;

-- Internal-only primitive: p_user_id is caller-supplied so this must not be
-- called directly by clients (see receive_stock/transfer_stock/adjust_stock
-- below, which pin auth.uid() themselves and are the intended entry points).

-- ---------------------------------------------------------------
-- 4. accounting primitive — one balanced journal entry per source
-- event. Idempotent: deletes any prior entry for the same
-- (source_type, source_id) before inserting, matching the
-- delete-and-reinsert convention used by billing/tax journal code.
-- Silently no-ops if either account is missing or amount is zero,
-- so inventory keeps working for companies that haven't finished
-- their accounting setup.
-- ---------------------------------------------------------------
create or replace function public.post_inventory_journal_entry(
  p_company_id uuid,
  p_user_id uuid,
  p_debit_account_id uuid,
  p_credit_account_id uuid,
  p_amount numeric,
  p_memo text,
  p_source_type text,
  p_source_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  delete from public.journal_entries where source_type = p_source_type and source_id = p_source_id;

  if p_debit_account_id is null or p_credit_account_id is null or p_amount is null or p_amount <= 0 then
    return null;
  end if;

  insert into public.journal_entries (company_id, user_id, entry_date, memo, source_type, source_id, is_posted)
  values (p_company_id, p_user_id, current_date, p_memo, p_source_type, p_source_id, true)
  returning id into v_entry_id;

  insert into public.journal_lines (company_id, user_id, entry_id, account_id, debit, credit, description)
  values
    (p_company_id, p_user_id, v_entry_id, p_debit_account_id, round(p_amount, 2), 0, p_memo),
    (p_company_id, p_user_id, v_entry_id, p_credit_account_id, 0, round(p_amount, 2), p_memo);

  return v_entry_id;
end;
$$;

-- Internal-only: no membership check of its own — relies on being called
-- only from receive_stock/dispatch_stock/adjust_stock, which validate via
-- record_stock_movement before this ever runs. Not granted to authenticated.

-- ---------------------------------------------------------------
-- 5. receive_stock — goods receipt, optionally against a PO line.
-- Debits Inventory, credits the caller-supplied offset account
-- (typically Accounts Payable / GRNI).
-- ---------------------------------------------------------------
create or replace function public.receive_stock(
  p_company_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_offset_account_id uuid default null,
  p_location_id uuid default null,
  p_note text default null,
  p_po_item_id uuid default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.stock_movements;
  v_inventory_account uuid;
begin
  if not is_company_member(p_company_id) then
    raise exception 'not a member of this company';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select inventory_account_id into v_inventory_account from public.items where id = p_item_id;

  v_movement := public.record_stock_movement(
    p_company_id, v_user_id, p_item_id, p_warehouse_id, p_quantity, 'receipt',
    p_location_id, p_note, null, 'purchase_receipt', p_po_item_id, p_unit_cost
  );

  perform public.post_inventory_journal_entry(
    p_company_id, v_user_id, v_inventory_account, p_offset_account_id,
    p_quantity * coalesce(p_unit_cost, 0), coalesce(p_note, 'Goods received'),
    'stock_movement_receipt', v_movement.id
  );

  if p_po_item_id is not null then
    update public.purchase_order_items
       set received_quantity = received_quantity + p_quantity
     where id = p_po_item_id;
  end if;

  return v_movement;
end;
$$;

grant execute on function public.receive_stock(
  uuid, uuid, uuid, numeric, numeric, uuid, uuid, text, uuid
) to authenticated;

-- ---------------------------------------------------------------
-- 6. dispatch_stock — stock leaving a warehouse (sale, manual
-- dispatch). Debits COGS, credits Inventory, valued at item.cost
-- unless a specific unit cost is supplied.
-- ---------------------------------------------------------------
create or replace function public.dispatch_stock(
  p_company_id uuid,
  p_user_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,          -- positive number of units leaving
  p_reason text default 'dispatch',
  p_unit_cost numeric default null,
  p_location_id uuid default null,
  p_note text default null,
  p_invoice_id uuid default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.stock_movements;
  v_inventory_account uuid;
  v_cogs_account uuid;
  v_cost numeric;
begin
  select inventory_account_id, cogs_account_id, coalesce(p_unit_cost, cost)
    into v_inventory_account, v_cogs_account, v_cost
    from public.items where id = p_item_id;

  v_movement := public.record_stock_movement(
    p_company_id, p_user_id, p_item_id, p_warehouse_id, -abs(p_quantity), p_reason,
    p_location_id, p_note, p_invoice_id, p_reference_type, p_reference_id, v_cost
  );

  perform public.post_inventory_journal_entry(
    p_company_id, p_user_id, v_cogs_account, v_inventory_account,
    abs(p_quantity) * coalesce(v_cost, 0), coalesce(p_note, 'Stock dispatched'),
    'stock_movement_dispatch', v_movement.id
  );

  return v_movement;
end;
$$;

-- Internal-only: called from apply_invoice_stock() (itself SECURITY DEFINER),
-- not exposed directly to end users, since p_user_id is caller-supplied and
-- a direct grant would let any company member misattribute who dispatched stock.

-- ---------------------------------------------------------------
-- 7. transfer_stock — move stock between warehouses. Two linked
-- movements, no accounting impact (see header comment).
-- ---------------------------------------------------------------
create or replace function public.transfer_stock(
  p_company_id uuid,
  p_item_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_quantity numeric,
  p_from_location_id uuid default null,
  p_to_location_id uuid default null,
  p_note text default null
)
returns table (movement_out public.stock_movements, movement_in public.stock_movements)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_out public.stock_movements;
  v_in public.stock_movements;
  v_ref uuid := gen_random_uuid();
begin
  if not is_company_member(p_company_id) then
    raise exception 'not a member of this company';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;
  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'source and destination warehouse must differ';
  end if;

  v_out := public.record_stock_movement(
    p_company_id, v_user_id, p_item_id, p_from_warehouse_id, -p_quantity, 'transfer_out',
    p_from_location_id, p_note, null, 'transfer', v_ref
  );
  v_in := public.record_stock_movement(
    p_company_id, v_user_id, p_item_id, p_to_warehouse_id, p_quantity, 'transfer_in',
    p_to_location_id, p_note, null, 'transfer', v_ref
  );

  return query select v_out, v_in;
end;
$$;

grant execute on function public.transfer_stock(
  uuid, uuid, uuid, uuid, numeric, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------------
-- 8. adjust_stock — cycle counts, damage, loss, found stock,
-- manual corrections. Posts an entry against a caller-supplied
-- offset account (e.g. "Inventory shrinkage") when the item has
-- an inventory_account_id configured.
-- ---------------------------------------------------------------
create or replace function public.adjust_stock(
  p_company_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity_delta numeric,     -- signed: positive = found, negative = loss/damage
  p_reason text,                -- 'cycle_count' | 'damaged' | 'lost' | 'found' | 'correction'
  p_offset_account_id uuid default null,
  p_location_id uuid default null,
  p_note text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.stock_movements;
  v_inventory_account uuid;
  v_cost numeric;
  v_debit uuid;
  v_credit uuid;
begin
  if p_reason not in ('cycle_count','damaged','lost','found','correction') then
    raise exception 'invalid adjustment reason: %', p_reason;
  end if;

  select inventory_account_id, cost into v_inventory_account, v_cost from public.items where id = p_item_id;

  v_movement := public.record_stock_movement(
    p_company_id, v_user_id, p_item_id, p_warehouse_id, p_quantity_delta, p_reason,
    p_location_id, p_note, null, 'adjustment', gen_random_uuid(), v_cost
  );

  if p_quantity_delta < 0 then
    v_debit := p_offset_account_id;
    v_credit := v_inventory_account;
  else
    v_debit := v_inventory_account;
    v_credit := p_offset_account_id;
  end if;

  perform public.post_inventory_journal_entry(
    p_company_id, v_user_id, v_debit, v_credit,
    abs(p_quantity_delta) * coalesce(v_cost, 0), coalesce(p_note, initcap(replace(p_reason, '_', ' '))),
    'stock_movement_adjustment', v_movement.id
  );

  return v_movement;
end;
$$;

grant execute on function public.adjust_stock(
  uuid, uuid, uuid, numeric, text, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------------
-- 9. rewrite the invoice trigger to go through dispatch_stock /
-- record_stock_movement instead of writing items.stock_quantity
-- directly — closes the "Sales" line from the accounting
-- integration phase (COGS now posts automatically on sale).
-- Same signature as before, so the existing triggers on public.invoices
-- keep working unchanged (trg_invoice_stock_ins/upd/del).
-- ---------------------------------------------------------------
create or replace function public.apply_invoice_stock(_invoice_id uuid, _direction integer, _reason text default 'invoice_paid')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_warehouse uuid;
begin
  for r in
    select ii.item_id, sum(ii.quantity) as qty, i.user_id, i.company_id, i.invoice_number,
           it.default_warehouse_id
    from public.invoice_items ii
    join public.invoices i on i.id = ii.invoice_id
    join public.items it on it.id = ii.item_id
    where ii.invoice_id = _invoice_id
      and ii.item_id is not null
      and it.type = 'product'
      and it.track_inventory = true
    group by ii.item_id, i.user_id, i.company_id, i.invoice_number, it.default_warehouse_id
  loop
    v_warehouse := r.default_warehouse_id;
    if v_warehouse is null then
      select id into v_warehouse from public.warehouses where company_id = r.company_id and is_default limit 1;
    end if;
    continue when v_warehouse is null;

    if _direction > 0 then
      -- selling: stock decreases, COGS posts
      perform public.dispatch_stock(
        r.company_id, r.user_id, r.item_id, v_warehouse, r.qty * _direction, _reason,
        null, null, 'Invoice ' || r.invoice_number, _invoice_id, 'invoice', _invoice_id
      );
    else
      -- reversal/deletion: stock returns, reverse the COGS entry for this invoice+item
      perform public.record_stock_movement(
        r.company_id, r.user_id, r.item_id, v_warehouse, r.qty * -_direction, _reason,
        null, 'Invoice ' || r.invoice_number, _invoice_id, 'invoice', _invoice_id
      );
      delete from public.journal_entries
       where source_type = 'stock_movement_dispatch'
         and source_id in (
           select id from public.stock_movements
           where invoice_id = _invoice_id and item_id = r.item_id and reason = 'invoice_paid'
         );
    end if;
  end loop;
end;
$$;
