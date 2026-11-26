-- Use the company's standard Inventory and COGS accounts when a product
-- has no valid product-specific account mappings. This prevents positive-cost
-- invoice dispatches from failing because optional item mappings are NULL.

CREATE OR REPLACE FUNCTION public.dispatch_stock(
  p_company_id uuid,
  p_user_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_reason text DEFAULT 'dispatch'::text,
  p_unit_cost numeric DEFAULT NULL::numeric,
  p_location_id uuid DEFAULT NULL::uuid,
  p_note text DEFAULT NULL::text,
  p_invoice_id uuid DEFAULT NULL::uuid,
  p_reference_type text DEFAULT NULL::text,
  p_reference_id uuid DEFAULT NULL::uuid
)
RETURNS public.stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_movement public.stock_movements;
  v_inventory_account uuid;
  v_cogs_account uuid;
  v_cost numeric;
BEGIN
  SELECT inventory_account_id, cogs_account_id, COALESCE(p_unit_cost, cost)
    INTO v_inventory_account, v_cogs_account, v_cost
    FROM public.items
   WHERE id = p_item_id
     AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory dispatch item does not belong to this company';
  END IF;

  IF v_inventory_account IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = v_inventory_account
       AND a.company_id = p_company_id
       AND a.is_active = true
       AND a.type = 'asset'
  ) THEN
    v_inventory_account := NULL;
  END IF;

  IF v_cogs_account IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = v_cogs_account
       AND a.company_id = p_company_id
       AND a.is_active = true
       AND a.type = 'expense'
  ) THEN
    v_cogs_account := NULL;
  END IF;

  IF v_inventory_account IS NULL THEN
    SELECT a.id INTO v_inventory_account
      FROM public.accounts a
     WHERE a.company_id = p_company_id
       AND a.code = '1200'
       AND a.type = 'asset'
       AND a.is_active = true
     ORDER BY a.id
     LIMIT 1;
  END IF;

  IF v_cogs_account IS NULL THEN
    SELECT a.id INTO v_cogs_account
      FROM public.accounts a
     WHERE a.company_id = p_company_id
       AND a.code = '5000'
       AND a.type = 'expense'
       AND a.is_active = true
     ORDER BY a.id
     LIMIT 1;
  END IF;

  IF v_inventory_account IS NOT NULL
     AND v_inventory_account = v_cogs_account THEN
    SELECT a.id INTO v_inventory_account
      FROM public.accounts a
     WHERE a.company_id = p_company_id
       AND a.code = '1200'
       AND a.type = 'asset'
       AND a.is_active = true
     ORDER BY a.id
     LIMIT 1;

    SELECT a.id INTO v_cogs_account
      FROM public.accounts a
     WHERE a.company_id = p_company_id
       AND a.code = '5000'
       AND a.type = 'expense'
       AND a.is_active = true
     ORDER BY a.id
     LIMIT 1;
  END IF;

  IF COALESCE(v_cost, 0) > 0
     AND (v_inventory_account IS NULL
       OR v_cogs_account IS NULL
       OR v_inventory_account = v_cogs_account) THEN
    RAISE EXCEPTION
      'Cannot post inventory cost: configure distinct active Inventory (asset) and Cost of Goods Sold (expense) accounts for this company';
  END IF;

  v_movement := public.record_stock_movement(
    p_company_id, p_user_id, p_item_id, p_warehouse_id, -abs(p_quantity), p_reason,
    p_location_id, p_note, p_invoice_id, p_reference_type, p_reference_id, v_cost
  );

  PERFORM public.post_inventory_journal_entry(
    p_company_id, p_user_id, v_cogs_account, v_inventory_account,
    abs(p_quantity) * COALESCE(v_cost, 0), COALESCE(p_note, 'Stock dispatched'),
    'stock_movement_dispatch', v_movement.id
  );

  RETURN v_movement;
END;
$function$;
