-- Finance-sensitive RPCs must not grant authority to every non-viewer.
-- Inventory movements are limited to inventory and finance roles. Bank
-- transfers and FX revaluation are limited to finance roles.
CREATE OR REPLACE FUNCTION public.adjust_stock(p_company_id uuid, p_item_id uuid, p_warehouse_id uuid, p_quantity_delta numeric, p_reason text, p_offset_account_id uuid DEFAULT NULL::uuid, p_location_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS stock_movements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_movement public.stock_movements;
  v_inventory_account uuid;
  v_cost numeric;
  v_debit uuid;
  v_credit uuid;
begin
  IF auth.uid() IS NULL
     OR NOT public.is_company_member(p_company_id)
     OR public.get_company_role(p_company_id) NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role,
       'inventory'::public.company_member_role
     ) THEN
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_bank_transfer(_from_account_id uuid, _to_account_id uuid, _amount numeric, _transfer_date date DEFAULT CURRENT_DATE, _notes text DEFAULT NULL::text)
 RETURNS bank_transfers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_from public.bank_accounts%ROWTYPE;
  v_to public.bank_accounts%ROWTYPE;
  v_transfer public.bank_transfers;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _from_account_id IS NULL OR _to_account_id IS NULL OR _from_account_id = _to_account_id THEN
    RAISE EXCEPTION 'Choose two different valid accounts';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _transfer_date IS NULL THEN RAISE EXCEPTION 'Transfer date is required'; END IF;
  PERFORM ba.id FROM public.bank_accounts ba
   WHERE ba.id IN (_from_account_id, _to_account_id) ORDER BY ba.id FOR UPDATE;
  SELECT ba.* INTO v_from FROM public.bank_accounts ba WHERE ba.id = _from_account_id;
  IF NOT FOUND OR NOT v_from.is_active THEN RAISE EXCEPTION 'Source account not found or inactive'; END IF;
  SELECT ba.* INTO v_to FROM public.bank_accounts ba WHERE ba.id = _to_account_id;
  IF NOT FOUND OR NOT v_to.is_active THEN RAISE EXCEPTION 'Destination account not found or inactive'; END IF;
  IF v_from.company_id IS NULL OR v_from.company_id <> v_to.company_id THEN
    RAISE EXCEPTION 'Both accounts must belong to the same company';
  END IF;
  IF v_from.currency IS DISTINCT FROM v_to.currency THEN
    RAISE EXCEPTION 'Transfers between different currencies are not supported';
  END IF;
  IF NOT public.is_company_member(v_from.company_id)
     OR public.get_company_role(v_from.company_id) NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role
     ) THEN
    RAISE EXCEPTION 'Not permitted to transfer funds for this company';
  END IF;
  INSERT INTO public.bank_transfers
    (user_id, company_id, from_account_id, to_account_id, amount, transfer_date, notes)
  VALUES (v_uid, v_from.company_id, _from_account_id, _to_account_id, _amount, _transfer_date, _notes)
  RETURNING * INTO v_transfer;
  INSERT INTO public.bank_transactions
    (user_id, company_id, bank_account_id, txn_date, description, amount, is_transfer, bank_transfer_id)
  VALUES
    (v_uid, v_from.company_id, _from_account_id, _transfer_date, 'Transfer to ' || v_to.name, -_amount, true, v_transfer.id),
    (v_uid, v_from.company_id, _to_account_id, _transfer_date, 'Transfer from ' || v_from.name, _amount, true, v_transfer.id);
  RETURN v_transfer;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.receive_stock(p_company_id uuid, p_item_id uuid, p_warehouse_id uuid, p_quantity numeric, p_unit_cost numeric, p_offset_account_id uuid DEFAULT NULL::uuid, p_location_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_po_item_id uuid DEFAULT NULL::uuid)
 RETURNS stock_movements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_movement public.stock_movements;
  v_inventory_account uuid;
begin
  IF auth.uid() IS NULL
     OR NOT public.is_company_member(p_company_id)
     OR public.get_company_role(p_company_id) NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role,
       'inventory'::public.company_member_role
     ) THEN
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
$function$
;

CREATE OR REPLACE FUNCTION public.revalue_open_transaction(_type text, _id uuid, _new_rate numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_old_base numeric;
  v_new_base numeric;
  v_diff numeric;
  v_status text;
  v_total numeric;
  v_fx_gain_id uuid;
  v_fx_loss_id uuid;
  v_eid uuid;
  v_clearing_id uuid;
  v_ref text;
  v_debits numeric;
  v_credits numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _new_rate IS NULL OR _new_rate <= 0 THEN
    RAISE EXCEPTION 'Revaluation rate must be positive';
  END IF;

  IF _type = 'invoice' THEN
    SELECT i.company_id, i.user_id, i.base_currency_amount, i.status, i.total, i.invoice_number
      INTO v_company_id, v_user_id, v_old_base, v_status, v_total, v_ref
      FROM public.invoices i
     WHERE i.id = _id
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    IF v_status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid invoice'; END IF;
    v_clearing_id := public.find_account_by_company(v_company_id, '1100');

  ELSIF _type = 'bill' THEN
    SELECT b.company_id, b.user_id, b.base_currency_amount, b.status, b.total, b.bill_number
      INTO v_company_id, v_user_id, v_old_base, v_status, v_total, v_ref
      FROM public.bills b
     WHERE b.id = _id
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF v_status = 'paid' THEN RAISE EXCEPTION 'Cannot revalue a fully paid bill'; END IF;
    v_clearing_id := public.find_account_by_company(v_company_id, '2000');

  ELSE
    RAISE EXCEPTION 'Unknown revaluation type: %', _type;
  END IF;

  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Transaction is missing company or user ownership';
  END IF;

  IF NOT public.is_company_member(v_company_id)
     OR public.get_company_role(v_company_id) NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role
     ) THEN
    RAISE EXCEPTION 'Not permitted to revalue transactions for this company';
  END IF;

  IF v_clearing_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.accounts a
     WHERE a.id = v_clearing_id
       AND a.is_active = true
       AND (a.company_id = v_company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'Chart of accounts is missing a valid company clearing account';
  END IF;

  v_new_base := round(v_total * _new_rate, 2);
  v_diff := round(v_new_base - COALESCE(v_old_base, v_total), 2);
  IF v_diff = 0 THEN RETURN; END IF;

  IF _type = 'invoice' THEN
    IF v_diff > 0 THEN
      v_fx_gain_id := public.find_account_by_company(v_company_id, '4910');
    ELSE
      v_fx_loss_id := public.find_account_by_company(v_company_id, '6910');
    END IF;
  ELSE
    IF v_diff > 0 THEN
      v_fx_loss_id := public.find_account_by_company(v_company_id, '6910');
    ELSE
      v_fx_gain_id := public.find_account_by_company(v_company_id, '4910');
    END IF;
  END IF;

  IF (_type = 'invoice' AND v_diff > 0 AND v_fx_gain_id IS NULL)
     OR (_type = 'invoice' AND v_diff < 0 AND v_fx_loss_id IS NULL)
     OR (_type = 'bill' AND v_diff > 0 AND v_fx_loss_id IS NULL)
     OR (_type = 'bill' AND v_diff < 0 AND v_fx_gain_id IS NULL) THEN
    RAISE EXCEPTION 'Chart of accounts is missing the required FX gain/loss account';
  END IF;

  IF v_fx_gain_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = v_fx_gain_id
       AND a.is_active = true
       AND (a.company_id = v_company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'FX gain account does not belong to this company';
  END IF;

  IF v_fx_loss_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = v_fx_loss_id
       AND a.is_active = true
       AND (a.company_id = v_company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'FX loss account does not belong to this company';
  END IF;

  IF _type = 'invoice' THEN
    UPDATE public.invoices
       SET exchange_rate = _new_rate,
           base_currency_amount = v_new_base
     WHERE id = _id
       AND company_id = v_company_id;
  ELSE
    UPDATE public.bills
       SET exchange_rate = _new_rate,
           base_currency_amount = v_new_base
     WHERE id = _id
       AND company_id = v_company_id;
  END IF;

  -- Keep the entry unposted while its lines are assembled; the journal-line
  -- balance trigger rejects any intermediate imbalance on posted entries.
  INSERT INTO public.journal_entries
    (user_id, company_id, entry_date, reference, memo, source_type, source_id, is_posted)
  VALUES
    (v_user_id, v_company_id, CURRENT_DATE, 'FXREV-' || v_ref,
     'FX revaluation of open ' || _type || ' ' || v_ref,
     'fx_revaluation', _id, false)
  RETURNING id INTO v_eid;

  IF _type = 'invoice' THEN
    IF v_diff > 0 THEN
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, v_diff, 0, 'AR revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_gain_id, 0, v_diff, 'Unrealized FX gain');
    ELSE
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, 0, -v_diff, 'AR revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_loss_id, -v_diff, 0, 'Unrealized FX loss');
    END IF;
  ELSE
    IF v_diff > 0 THEN
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, 0, v_diff, 'AP revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_loss_id, v_diff, 0, 'Unrealized FX loss');
    ELSE
      INSERT INTO public.journal_lines
        (user_id, company_id, entry_id, account_id, debit, credit, description)
      VALUES
        (v_user_id, v_company_id, v_eid, v_clearing_id, -v_diff, 0, 'AP revaluation'),
        (v_user_id, v_company_id, v_eid, v_fx_gain_id, 0, -v_diff, 'Unrealized FX gain');
    END IF;
  END IF;

  SELECT COALESCE(sum(jl.debit), 0), COALESCE(sum(jl.credit), 0)
    INTO v_debits, v_credits
    FROM public.journal_lines jl
   WHERE jl.entry_id = v_eid
     AND jl.company_id = v_company_id;

  IF round(v_debits, 2) <> round(v_credits, 2) THEN
    RAISE EXCEPTION 'FX revaluation journal entry is unbalanced';
  END IF;

  UPDATE public.journal_entries
     SET is_posted = true
   WHERE id = v_eid
     AND company_id = v_company_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.transfer_stock(p_company_id uuid, p_item_id uuid, p_from_warehouse_id uuid, p_to_warehouse_id uuid, p_quantity numeric, p_from_location_id uuid DEFAULT NULL::uuid, p_to_location_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS TABLE(movement_out stock_movements, movement_in stock_movements)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_out public.stock_movements;
  v_in public.stock_movements;
  v_ref uuid := gen_random_uuid();
begin
  IF auth.uid() IS NULL
     OR NOT public.is_company_member(p_company_id)
     OR public.get_company_role(p_company_id) NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role,
       'inventory'::public.company_member_role
     ) THEN
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
$function$
;
