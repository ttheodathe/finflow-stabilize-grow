-- Enforce tenant ownership and actor attribution inside the internal stock
-- movement primitive. The public wrappers pin the interactive actor to auth.uid();
-- invoice-triggered movements use the invoice creator as the actor.

create or replace function public.record_stock_movement(
  p_company_id uuid,
  p_user_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity_change numeric,
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
as $function$
declare
  v_balance numeric;
  v_movement public.stock_movements;
  v_invoice_user_id uuid;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'not a member of this company';
  end if;

  if not exists (
    select 1 from public.items
    where id = p_item_id and company_id = p_company_id
  ) then
    raise exception 'item does not belong to this company';
  end if;

  if not exists (
    select 1 from public.warehouses
    where id = p_warehouse_id and company_id = p_company_id
  ) then
    raise exception 'warehouse does not belong to this company';
  end if;

  if p_location_id is not null and not exists (
    select 1 from public.warehouse_locations
    where id = p_location_id
      and company_id = p_company_id
      and warehouse_id = p_warehouse_id
  ) then
    raise exception 'location does not belong to this company and warehouse';
  end if;

  if p_reference_type = 'invoice' then
    select user_id into v_invoice_user_id
    from public.invoices
    where id = p_invoice_id and company_id = p_company_id;

    if not found or p_user_id is distinct from v_invoice_user_id then
      raise exception 'invoice reference or movement actor is invalid';
    end if;
  else
    if auth.uid() is null or p_user_id is distinct from auth.uid() then
      raise exception 'movement actor must be the signed-in user';
    end if;
  end if;

  if p_invoice_id is not null and not exists (
    select 1 from public.invoices
    where id = p_invoice_id and company_id = p_company_id
  ) then
    raise exception 'invoice does not belong to this company';
  end if;

  if p_reference_type = 'purchase_receipt'
     and p_reference_id is not null
     and not exists (
       select 1 from public.purchase_order_items
       where id = p_reference_id
         and company_id = p_company_id
         and item_id = p_item_id
     ) then
    raise exception 'purchase order line does not match this company and item';
  end if;

  if p_location_id is null then
    insert into public.inventory_balances (
      company_id, item_id, warehouse_id, location_id, quantity_on_hand
    )
    values (p_company_id, p_item_id, p_warehouse_id, null, p_quantity_change)
    on conflict (item_id, warehouse_id) where location_id is null
    do update set
      quantity_on_hand = public.inventory_balances.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = pg_catalog.now()
    returning quantity_on_hand into v_balance;
  else
    insert into public.inventory_balances (
      company_id, item_id, warehouse_id, location_id, quantity_on_hand
    )
    values (p_company_id, p_item_id, p_warehouse_id, p_location_id, p_quantity_change)
    on conflict (item_id, warehouse_id, location_id) where location_id is not null
    do update set
      quantity_on_hand = public.inventory_balances.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = pg_catalog.now()
    returning quantity_on_hand into v_balance;
  end if;

  insert into public.stock_movements (
    company_id, user_id, item_id, warehouse_id, location_id, invoice_id,
    quantity_change, balance_after, reason, note, reference_type, reference_id, unit_cost
  )
  values (
    p_company_id, p_user_id, p_item_id, p_warehouse_id, p_location_id, p_invoice_id,
    p_quantity_change, v_balance, p_reason, p_note, p_reference_type, p_reference_id, p_unit_cost
  )
  returning * into v_movement;

  update public.items
  set stock_quantity = (
    select coalesce(sum(quantity_on_hand), 0)
    from public.inventory_balances
    where item_id = p_item_id and company_id = p_company_id
  )
  where id = p_item_id and company_id = p_company_id;

  return v_movement;
end;
$function$;
