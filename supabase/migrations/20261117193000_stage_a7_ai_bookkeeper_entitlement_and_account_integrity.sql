-- Enforce AI Bookkeeper entitlements and preserve company/account correctness
-- when bank transactions are categorized or matched to invoice/bill payments.

CREATE OR REPLACE FUNCTION public.company_has_active_ai_bookkeeper_plan(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.company_id = p_company_id
        AND lower(s.plan) IN ('pro', 'professional', 'starter', 'business', 'growth', 'team', 'enterprise', 'custom')
        AND s.status IN ('active', 'trialing')
    )
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.company_members cm ON cm.user_id = s.user_id
      WHERE cm.company_id = p_company_id
        AND cm.role::text = 'owner'
        AND cm.status::text = 'active'
        AND s.company_id IS NULL
        AND lower(s.plan) IN ('pro', 'professional', 'starter', 'business', 'growth', 'team', 'enterprise', 'custom')
        AND s.status IN ('active', 'trialing')
    );
$$;

REVOKE ALL ON FUNCTION public.company_has_active_ai_bookkeeper_plan(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ai_process_pending_transactions(_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  r record;
  n integer := 0;
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_company_member(_company_id) THEN
    RAISE EXCEPTION 'Not permitted for this company' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_company_role(_company_id);
  IF COALESCE(v_role, '') NOT IN ('owner', 'admin', 'accountant') THEN
    RAISE EXCEPTION 'Only owners, admins and accountants may run AI transaction processing'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.company_has_active_ai_bookkeeper_plan(_company_id) THEN
    RAISE EXCEPTION 'AI Bookkeeper requires an active Professional or Business plan'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT bt.id
    FROM public.bank_transactions bt
    WHERE bt.company_id = _company_id
      AND bt.is_transfer = false
      AND bt.reconciled = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.ai_review_queue q
        WHERE q.source_table = 'bank_transactions'
          AND q.source_id = bt.id
      )
    ORDER BY bt.created_at, bt.id
    FOR UPDATE OF bt SKIP LOCKED
  LOOP
    PERFORM public.ai_process_bank_transaction(r.id);
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_process_pending_transactions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_process_pending_transactions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_resolve_review_task(_task_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  q record;
  t record;
  ba record;
  v_doc record;
  v_role text;
  v_outstanding numeric;
  v_paid numeric;
BEGIN
  SELECT *
    INTO q
    FROM public.ai_review_queue
   WHERE id = _task_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or already resolved';
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_company_member(q.company_id) THEN
    RAISE EXCEPTION 'Not permitted for this company' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_company_role(q.company_id);
  IF COALESCE(v_role, '') NOT IN ('owner', 'admin', 'accountant') THEN
    RAISE EXCEPTION 'Only owners, admins and accountants may resolve AI review tasks'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.company_has_active_ai_bookkeeper_plan(q.company_id) THEN
    RAISE EXCEPTION 'AI Bookkeeper requires an active Professional or Business plan'
      USING ERRCODE = '42501';
  END IF;

  IF NOT _approve THEN
    UPDATE public.ai_review_queue
       SET status = 'rejected',
           resolved_at = pg_catalog.now(),
           resolved_by = auth.uid()
     WHERE id = _task_id;
    RETURN;
  END IF;

  IF q.source_table <> 'bank_transactions' THEN
    RAISE EXCEPTION 'Unsupported AI review source';
  END IF;

  SELECT *
    INTO t
    FROM public.bank_transactions
   WHERE id = q.source_id
     AND company_id = q.company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source transaction not found in this company';
  END IF;

  IF t.reconciled OR t.is_transfer OR t.amount = 0 THEN
    RAISE EXCEPTION 'Source transaction is already reconciled, is a transfer, or has a zero amount';
  END IF;

  SELECT id, currency, company_id, gl_account_id, is_active
    INTO ba
    FROM public.bank_accounts
   WHERE id = t.bank_account_id
     AND company_id = q.company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account is missing or belongs to another company';
  END IF;
  IF NOT ba.is_active THEN
    RAISE EXCEPTION 'Bank account is inactive';
  END IF;

  IF q.task_type = 'categorize_transaction' THEN
    -- Categorization is permitted without a mapped GL bank account.
    -- The proposed category account itself must be active and company-safe.
    IF q.proposed->>'category_account_id' IS NULL THEN
      RAISE EXCEPTION 'Proposed category account is missing';
    END IF;

    IF NOT EXISTS (
      SELECT 1
        FROM public.accounts a
       WHERE a.id = NULLIF(q.proposed->>'category_account_id', '')::uuid
         AND a.is_active = true
         AND (a.company_id = q.company_id OR (a.company_id IS NULL AND a.is_system = true))
    ) THEN
      RAISE EXCEPTION 'Proposed category account is invalid for this company';
    END IF;

    UPDATE public.bank_transactions
       SET category_account_id = NULLIF(q.proposed->>'category_account_id', '')::uuid
     WHERE id = q.source_id
       AND company_id = q.company_id
       AND reconciled = false;

  ELSIF q.task_type = 'match_bill_payment' THEN
    IF t.amount >= 0 THEN
      RAISE EXCEPTION 'A bill payment must match a bank outflow';
    END IF;

    SELECT id, total, currency, vendor_id, status
      INTO v_doc
      FROM public.bills
     WHERE id = NULLIF(q.proposed->>'bill_id', '')::uuid
       AND company_id = q.company_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proposed bill is missing or belongs to another company';
    END IF;
    IF v_doc.status NOT IN ('open', 'partial') THEN
      RAISE EXCEPTION 'Proposed bill is not open for payment';
    END IF;

    IF v_doc.currency <> ba.currency THEN
      RAISE EXCEPTION 'Bank account and bill currencies differ; an approved FX workflow is required';
    END IF;

    IF ba.gl_account_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.accounts a
       WHERE a.id = ba.gl_account_id
         AND a.is_active = true
         AND (a.company_id = q.company_id OR (a.company_id IS NULL AND a.is_system = true))
    ) THEN
      RAISE EXCEPTION 'Map this bank account to an active company ledger account before applying a bill payment';
    END IF;

    SELECT COALESCE(SUM(bp.amount), 0)
      INTO v_paid
      FROM public.bill_payments bp
     WHERE bp.bill_id = v_doc.id;
    v_outstanding := v_doc.total - v_paid;

    IF v_outstanding <= 0 OR abs(t.amount) > v_outstanding + 0.000001 THEN
      RAISE EXCEPTION 'Payment exceeds the outstanding bill balance';
    END IF;

    INSERT INTO public.bill_payments
      (company_id, user_id, bill_id, vendor_id, payment_date, amount, currency, method, reference, notes, source_account_id)
    VALUES
      (q.company_id, t.user_id, v_doc.id, v_doc.vendor_id, t.txn_date, abs(t.amount), ba.currency,
       'bank_transfer', t.reference, 'Confirmed via AI Bookkeeper review queue', ba.gl_account_id);

    UPDATE public.bank_transactions
       SET reconciled = true,
           matched_type = 'bill',
           matched_id = v_doc.id
     WHERE id = q.source_id
       AND company_id = q.company_id
       AND reconciled = false;

  ELSIF q.task_type = 'match_invoice_payment' THEN
    IF t.amount <= 0 THEN
      RAISE EXCEPTION 'An invoice payment must match a bank inflow';
    END IF;

    SELECT id, total, currency, customer_id, status
      INTO v_doc
      FROM public.invoices
     WHERE id = NULLIF(q.proposed->>'invoice_id', '')::uuid
       AND company_id = q.company_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proposed invoice is missing or belongs to another company';
    END IF;
    IF v_doc.status NOT IN ('sent', 'partial', 'overdue') THEN
      RAISE EXCEPTION 'Proposed invoice is not open for payment';
    END IF;

    IF v_doc.currency <> ba.currency THEN
      RAISE EXCEPTION 'Bank account and invoice currencies differ; an approved FX workflow is required';
    END IF;

    IF ba.gl_account_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.accounts a
       WHERE a.id = ba.gl_account_id
         AND a.is_active = true
         AND (a.company_id = q.company_id OR (a.company_id IS NULL AND a.is_system = true))
    ) THEN
      RAISE EXCEPTION 'Map this bank account to an active company ledger account before applying an invoice payment';
    END IF;

    SELECT COALESCE(SUM(p.amount), 0)
      INTO v_paid
      FROM public.payments p
     WHERE p.invoice_id = v_doc.id;
    v_outstanding := v_doc.total - v_paid;

    IF v_outstanding <= 0 OR t.amount > v_outstanding + 0.000001 THEN
      RAISE EXCEPTION 'Payment exceeds the outstanding invoice balance';
    END IF;

    INSERT INTO public.payments
      (company_id, user_id, invoice_id, customer_id, payment_date, amount, currency, method, reference, notes, deposit_account_id)
    VALUES
      (q.company_id, t.user_id, v_doc.id, v_doc.customer_id, t.txn_date, t.amount, ba.currency,
       'bank_transfer', t.reference, 'Confirmed via AI Bookkeeper review queue', ba.gl_account_id);

    UPDATE public.bank_transactions
       SET reconciled = true,
           matched_type = 'invoice',
           matched_id = v_doc.id
     WHERE id = q.source_id
       AND company_id = q.company_id
       AND reconciled = false;

  ELSE
    RAISE EXCEPTION 'Unsupported AI review task type';
  END IF;

  UPDATE public.ai_review_queue
     SET status = 'approved',
         resolved_at = pg_catalog.now(),
         resolved_by = auth.uid()
   WHERE id = _task_id
     AND status = 'pending';
END;
$function$;

REVOKE ALL ON FUNCTION public.ai_resolve_review_task(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_resolve_review_task(uuid, boolean) TO authenticated;

-- Keep the AI processor company-scoped, concurrency-safe, outstanding-balance
-- aware, and tied to the actual GL account behind the imported bank account.
DO $$
DECLARE
  definition text;
  old_fragment text;
  new_fragment text;
BEGIN
  definition := pg_get_functiondef('public.ai_process_bank_transaction(uuid)'::regprocedure);

  old_fragment := 'SELECT * INTO t FROM public.bank_transactions WHERE id = _txn_id;';
  new_fragment := 'SELECT * INTO t FROM public.bank_transactions WHERE id = _txn_id FOR UPDATE;';
  IF position(old_fragment IN definition) = 0 THEN
    IF position(new_fragment IN definition) = 0 THEN
      RAISE EXCEPTION 'Bank transaction lock fragment not found';
    END IF;
  ELSE
    definition := replace(definition, old_fragment, new_fragment);
  END IF;

  old_fragment := 'IF t IS NULL OR t.is_transfer OR t.reconciled THEN RETURN; END IF;';
  new_fragment := 'IF t IS NULL OR t.is_transfer OR t.reconciled OR t.amount = 0 THEN RETURN; END IF;';
  IF position(old_fragment IN definition) = 0 THEN
    IF position(new_fragment IN definition) = 0 THEN
      RAISE EXCEPTION 'Bank transaction eligibility fragment not found';
    END IF;
  ELSE
    definition := replace(definition, old_fragment, new_fragment);
  END IF;

  old_fragment := 'SELECT id, currency INTO ba FROM public.bank_accounts WHERE id = t.bank_account_id;';
  new_fragment := 'SELECT id, currency, gl_account_id, is_active INTO ba FROM public.bank_accounts WHERE id = t.bank_account_id AND company_id = t.company_id FOR SHARE;';
  IF position(old_fragment IN definition) = 0 THEN
    IF position(new_fragment IN definition) = 0 THEN
      RAISE EXCEPTION 'Bank account scope fragment not found';
    END IF;
  ELSE
    definition := replace(definition, old_fragment, new_fragment);
  END IF;

  old_fragment := 'IF ba IS NULL THEN RETURN; END IF;';
  new_fragment := 'IF ba IS NULL OR NOT ba.is_active THEN RETURN; END IF;';
  IF position(old_fragment IN definition) = 0 THEN
    IF position(new_fragment IN definition) = 0 THEN
      RAISE EXCEPTION 'Bank account active-state fragment not found';
    END IF;
  ELSE
    definition := replace(definition, old_fragment, new_fragment);
  END IF;

  old_fragment := 'SELECT b.id, b.bill_number, b.total, b.currency, v.id AS vendor_id, v.name AS vendor_name,';
  new_fragment := 'SELECT b.id, b.bill_number, (b.total - COALESCE(bp.paid, 0)) AS total, b.currency, v.id AS vendor_id, v.name AS vendor_name,';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Bill match select fragment not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := 'FROM public.bills b' || chr(10) || '    LEFT JOIN public.vendors v ON v.id = b.vendor_id';
  new_fragment := 'FROM public.bills b' || chr(10) ||
    '    LEFT JOIN LATERAL (SELECT COALESCE(SUM(bp.amount), 0) AS paid FROM public.bill_payments bp WHERE bp.bill_id = b.id) bp ON true' || chr(10) ||
    '    LEFT JOIN public.vendors v ON v.id = b.vendor_id';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Bill match join fragment not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := 'WHERE b.company_id = t.company_id AND b.status IN (''open'', ''partial'')' || chr(10) ||
    '      AND abs(b.total - amt) <= greatest(amt * 0.02, 0.02)';
  new_fragment := 'WHERE b.company_id = t.company_id AND b.status IN (''open'', ''partial'')' || chr(10) ||
    '      AND (b.total - COALESCE(bp.paid, 0)) > 0' || chr(10) ||
    '      AND abs((b.total - COALESCE(bp.paid, 0)) - amt) <= greatest(amt * 0.02, 0.02)';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Bill outstanding-balance predicate not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);
  definition := replace(definition, 'abs(b.total - amt)', 'abs((b.total - COALESCE(bp.paid, 0)) - amt)');

  old_fragment := 'SELECT i.id, i.invoice_number, i.total, i.currency, c.id AS customer_id, c.name AS customer_name,';
  new_fragment := 'SELECT i.id, i.invoice_number, (i.total - COALESCE(ip.paid, 0)) AS total, i.currency, c.id AS customer_id, c.name AS customer_name,';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Invoice match select fragment not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := 'FROM public.invoices i' || chr(10) || '    LEFT JOIN public.customers c ON c.id = i.customer_id';
  new_fragment := 'FROM public.invoices i' || chr(10) ||
    '    LEFT JOIN LATERAL (SELECT COALESCE(SUM(ip.amount), 0) AS paid FROM public.payments ip WHERE ip.invoice_id = i.id) ip ON true' || chr(10) ||
    '    LEFT JOIN public.customers c ON c.id = i.customer_id';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Invoice match join fragment not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := 'WHERE i.company_id = t.company_id AND i.status IN (''sent'', ''partial'', ''overdue'')' || chr(10) ||
    '      AND abs(i.total - amt) <= greatest(amt * 0.02, 0.02)';
  new_fragment := 'WHERE i.company_id = t.company_id AND i.status IN (''sent'', ''partial'', ''overdue'')' || chr(10) ||
    '      AND (i.total - COALESCE(ip.paid, 0)) > 0' || chr(10) ||
    '      AND abs((i.total - COALESCE(ip.paid, 0)) - amt) <= greatest(amt * 0.02, 0.02)';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Invoice outstanding-balance predicate not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);
  definition := replace(definition, 'abs(i.total - amt)', 'abs((i.total - COALESCE(ip.paid, 0)) - amt)');

  old_fragment := 'IF conf >= 0.99 AND best.currency = ba.currency THEN';
  new_fragment := 'IF conf >= 0.99 AND best.currency = ba.currency AND amt <= best.total + 0.000001 AND ba.gl_account_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = ba.gl_account_id AND a.is_active = true AND (a.company_id = t.company_id OR (a.company_id IS NULL AND a.is_system = true))) THEN';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Auto-match eligibility condition not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := 'INSERT INTO public.bill_payments (company_id, user_id, bill_id, vendor_id, payment_date, amount, currency, method, reference, notes)';
  new_fragment := 'INSERT INTO public.bill_payments (company_id, user_id, bill_id, vendor_id, payment_date, amount, currency, method, reference, notes, source_account_id)';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Bill payment insert columns not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := '''Auto-matched by AI Bookkeeper from bank transaction: '' || t.description);';
  new_fragment := '''Auto-matched by AI Bookkeeper from bank transaction: '' || t.description, ba.gl_account_id);';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'AI payment insert values not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  old_fragment := 'INSERT INTO public.payments (company_id, user_id, invoice_id, customer_id, payment_date, amount, currency, method, reference, notes)';
  new_fragment := 'INSERT INTO public.payments (company_id, user_id, invoice_id, customer_id, payment_date, amount, currency, method, reference, notes, deposit_account_id)';
  IF position(old_fragment IN definition) = 0 THEN RAISE EXCEPTION 'Invoice payment insert columns not found'; END IF;
  definition := replace(definition, old_fragment, new_fragment);

  IF position('extensions.extensions.similarity(' IN definition) > 0 THEN
    RAISE EXCEPTION 'Malformed pg_trgm qualification remains in AI processor';
  END IF;

  EXECUTE definition;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_process_pending_transactions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_process_pending_transactions(uuid) TO authenticated;
