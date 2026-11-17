-- Enforce the paid AI Bookkeeper entitlement at the database boundary.
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
        AND s.plan IN ('pro', 'business', 'enterprise')
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
        AND s.plan IN ('pro', 'business', 'enterprise')
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
  IF v_role NOT IN ('owner', 'admin', 'accountant') THEN
    RAISE EXCEPTION 'Only owners, admins and accountants may run AI transaction processing'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.company_has_active_ai_bookkeeper_plan(_company_id) THEN
    RAISE EXCEPTION 'AI Bookkeeper requires an active Professional or Business plan'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT id
    FROM public.bank_transactions
    WHERE company_id = _company_id
      AND is_transfer = false
      AND reconciled = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.ai_review_queue q
        WHERE q.source_table = 'bank_transactions'
          AND q.source_id = bank_transactions.id
      )
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
  v_target_id uuid;
  v_role text;
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
  IF v_role NOT IN ('owner', 'admin', 'accountant') THEN
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

  SELECT currency, company_id
    INTO ba
    FROM public.bank_accounts
   WHERE id = t.bank_account_id
     AND company_id = q.company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account does not belong to this company';
  END IF;

  IF q.task_type = 'categorize_transaction' THEN
    v_target_id := NULLIF(q.proposed->>'category_account_id', '')::uuid;

    IF v_target_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.accounts a
       WHERE a.id = v_target_id
         AND a.is_active = true
         AND (a.company_id = q.company_id OR (a.company_id IS NULL AND a.is_system = true))
    ) THEN
      RAISE EXCEPTION 'Proposed category account is invalid for this company';
    END IF;

    UPDATE public.bank_transactions
       SET category_account_id = v_target_id
     WHERE id = q.source_id
       AND company_id = q.company_id;

  ELSIF q.task_type = 'match_bill_payment' THEN
    v_target_id := NULLIF(q.proposed->>'bill_id', '')::uuid;

    IF v_target_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.bills b
       WHERE b.id = v_target_id
         AND b.company_id = q.company_id
    ) THEN
      RAISE EXCEPTION 'Proposed bill does not belong to this company';
    END IF;

    INSERT INTO public.bill_payments
      (company_id, user_id, bill_id, payment_date, amount, currency, method, reference, notes)
    VALUES
      (q.company_id, t.user_id, v_target_id, t.txn_date, abs(t.amount), ba.currency,
       'bank_transfer', t.reference, 'Confirmed via AI Bookkeeper review queue');

    UPDATE public.bank_transactions
       SET reconciled = true,
           matched_type = 'bill',
           matched_id = v_target_id
     WHERE id = q.source_id
       AND company_id = q.company_id;

  ELSIF q.task_type = 'match_invoice_payment' THEN
    v_target_id := NULLIF(q.proposed->>'invoice_id', '')::uuid;

    IF v_target_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.invoices i
       WHERE i.id = v_target_id
         AND i.company_id = q.company_id
    ) THEN
      RAISE EXCEPTION 'Proposed invoice does not belong to this company';
    END IF;

    INSERT INTO public.payments
      (company_id, user_id, invoice_id, payment_date, amount, currency, method, reference, notes)
    VALUES
      (q.company_id, t.user_id, v_target_id, t.txn_date, abs(t.amount), ba.currency,
       'bank_transfer', t.reference, 'Confirmed via AI Bookkeeper review queue');

    UPDATE public.bank_transactions
       SET reconciled = true,
           matched_type = 'invoice',
           matched_id = v_target_id
     WHERE id = q.source_id
       AND company_id = q.company_id;

  ELSE
    RAISE EXCEPTION 'Unsupported AI review task type';
  END IF;

  UPDATE public.ai_review_queue
     SET status = 'approved',
         resolved_at = pg_catalog.now(),
         resolved_by = auth.uid()
   WHERE id = _task_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.ai_resolve_review_task(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_resolve_review_task(uuid, boolean) TO authenticated;
