-- View-only company members may not trigger accounting automation or change stock.

create or replace function public.ai_process_pending_transactions(_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  r record;
  n integer := 0;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'Not permitted for this company';
  end if;

  if public.get_company_role(_company_id) = 'viewer' then
    raise exception 'View-only members cannot run AI transaction processing';
  end if;

  for r in
    select id
    from public.bank_transactions
    where company_id = _company_id
      and is_transfer = false
      and reconciled = false
      and not exists (
        select 1
        from public.ai_review_queue q
        where q.source_table = 'bank_transactions'
          and q.source_id = bank_transactions.id
      )
  loop
    perform public.ai_process_bank_transaction(r.id);
    n := n + 1;
  end loop;

  return n;
end;
$function$;

create or replace function public.adjust_stock(
  p_company_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity_delta numeric,
  p_reason text,
  p_offset_account_id uuid default null,
  p_location_id uuid default null,
  p_note text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_movement public.stock_movements;
  v_inventory_account uuid;
  v_cost numeric;
  v_debit uuid;
  v_credit uuid;
begin
  if not public.is_company_member(p_company_id)
     or public.get_company_role(p_company_id) = 'viewer' then
    raise exception 'Not permitted to adjust stock for this company';
  end if;

  if p_reason not in ('cycle_count','damaged','lost','found','correction') then
    raise exception 'invalid adjustment reason: %', p_reason;
  end if;

  select inventory_account_id, cost
    into v_inventory_account, v_cost
  from public.items
  where id = p_item_id and company_id = p_company_id;

  if not found then
    raise exception 'item does not belong to this company';
  end if;

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
$function$;

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
as $function$
declare
  v_user_id uuid := auth.uid();
  v_movement public.stock_movements;
  v_inventory_account uuid;
begin
  if not public.is_company_member(p_company_id)
     or public.get_company_role(p_company_id) = 'viewer' then
    raise exception 'Not permitted to receive stock for this company';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select inventory_account_id into v_inventory_account
  from public.items
  where id = p_item_id and company_id = p_company_id;

  if not found then
    raise exception 'item does not belong to this company';
  end if;

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
     where id = p_po_item_id and company_id = p_company_id and item_id = p_item_id;
  end if;

  return v_movement;
end;
$function$;

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
returns table(movement_out public.stock_movements, movement_in public.stock_movements)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_out public.stock_movements;
  v_in public.stock_movements;
  v_ref uuid := gen_random_uuid();
begin
  if not public.is_company_member(p_company_id)
     or public.get_company_role(p_company_id) = 'viewer' then
    raise exception 'Not permitted to transfer stock for this company';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'source and destination warehouse must differ';
  end if;

  if not exists (
    select 1 from public.items where id = p_item_id and company_id = p_company_id
  ) then
    raise exception 'item does not belong to this company';
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
$function$;
