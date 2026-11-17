CREATE OR REPLACE FUNCTION public.ai_resolve_review_task(_task_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  q record;
  t record;
  ba record;
  v_target_id uuid;
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

  IF auth.uid() IS NULL
     OR NOT public.is_company_member(q.company_id)
     OR public.get_company_role(q.company_id) = 'viewer' THEN
    RAISE EXCEPTION 'Not permitted for this company';
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
