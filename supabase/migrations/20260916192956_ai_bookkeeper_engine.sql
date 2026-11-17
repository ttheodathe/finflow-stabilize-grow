-- ============================================================
-- AI Bookkeeper: automatic categorization, bill/invoice matching,
-- self-driven reconciliation, and a confidence-gated human review
-- queue. Anything the matching engine is less than 99% sure about
-- is queued for review instead of auto-applied — never silently
-- guessed into the books.
--
-- Cross-currency transactions are ALWAYS queued for review, never
-- auto-applied: a correct FX rate requires a live lookup (JS-side,
-- via lockExchangeRate), which a pure-SQL matching engine cannot do
-- safely. Auto-apply only ever happens in matching currencies.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------
-- 1. Review queue — the human-in-the-loop layer.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('categorize_transaction','match_bill_payment','match_invoice_payment')),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  proposed jsonb NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto_applied')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
CREATE INDEX IF NOT EXISTS idx_ai_review_queue_company_status ON public.ai_review_queue(company_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_review_queue_pending_source
  ON public.ai_review_queue(source_table, source_id) WHERE status = 'pending';

ALTER TABLE public.ai_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members select" ON public.ai_review_queue FOR SELECT
  USING (public.is_company_member(company_id));
CREATE POLICY "company members insert" ON public.ai_review_queue FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) <> 'viewer');
CREATE POLICY "company members update" ON public.ai_review_queue FOR UPDATE
  USING (public.is_company_member(company_id) AND public.get_company_role(company_id) <> 'viewer')
  WITH CHECK (public.is_company_member(company_id) AND public.get_company_role(company_id) <> 'viewer');
CREATE POLICY "company admins delete" ON public.ai_review_queue FOR DELETE
  USING (public.is_company_admin(company_id));

-- ------------------------------------------------------------
-- 2. Bank transaction columns to record what the AI did.
-- ------------------------------------------------------------
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS matched_type text,
  ADD COLUMN IF NOT EXISTS matched_id uuid;

-- ------------------------------------------------------------
-- 3. The matching/categorization engine for a single transaction.
--    Idempotent: clears any existing pending queue row for this
--    transaction before re-evaluating, so it's safe to re-run.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_process_bank_transaction(_txn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  t RECORD; ba RECORD; best RECORD; amt numeric; conf numeric;
  cat_id uuid; cat_conf numeric; cat_reason text;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = _txn_id;
  IF t IS NULL OR t.is_transfer OR t.reconciled THEN RETURN; END IF;

  SELECT id, currency INTO ba FROM public.bank_accounts WHERE id = t.bank_account_id;
  IF ba IS NULL THEN RETURN; END IF;

  DELETE FROM public.ai_review_queue
    WHERE source_table = 'bank_transactions' AND source_id = _txn_id AND status = 'pending';

  amt := abs(t.amount);

  IF t.amount < 0 THEN
    -- money out: try to match an open bill
    SELECT b.id, b.bill_number, b.total, b.currency, v.id AS vendor_id, v.name AS vendor_name,
      (0.6 * (1 - least(abs(b.total - amt) / greatest(amt, 0.01), 1))
       + 0.4 * coalesce(similarity(coalesce(v.name, ''), t.description), 0)) AS score
    INTO best
    FROM public.bills b
    LEFT JOIN public.vendors v ON v.id = b.vendor_id
    WHERE b.company_id = t.company_id AND b.status IN ('open', 'partial')
      AND abs(b.total - amt) <= greatest(amt * 0.02, 0.02)
    ORDER BY score DESC
    LIMIT 1;

    IF best.id IS NOT NULL THEN
      conf := least(greatest(best.score, 0), 1);
      IF conf >= 0.99 AND best.currency = ba.currency THEN
        INSERT INTO public.bill_payments (company_id, user_id, bill_id, vendor_id, payment_date, amount, currency, method, reference, notes)
          VALUES (t.company_id, t.user_id, best.id, best.vendor_id, t.txn_date, amt, ba.currency, 'bank_transfer', t.reference,
                   'Auto-matched by AI Bookkeeper from bank transaction: ' || t.description);
        UPDATE public.bank_transactions SET reconciled = true, matched_type = 'bill', matched_id = best.id, ai_confidence = conf
          WHERE id = _txn_id;
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason, resolved_at)
          VALUES (t.company_id, t.user_id, 'match_bill_payment', 'bank_transactions', _txn_id,
                   jsonb_build_object('bill_id', best.id, 'bill_number', best.bill_number, 'amount', amt),
                   conf, 'auto_applied', 'Matched to bill ' || best.bill_number || ' — amount and vendor name matched', now());
        RETURN;
      ELSIF best.currency <> ba.currency THEN
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason)
          VALUES (t.company_id, t.user_id, 'match_bill_payment', 'bank_transactions', _txn_id,
                   jsonb_build_object('bill_id', best.id, 'bill_number', best.bill_number, 'amount', amt, 'currency_mismatch', true),
                   conf, 'pending', 'Possible match to bill ' || best.bill_number || ', but currencies differ (' || best.currency || ' vs ' || ba.currency || ') — needs a live FX rate before applying');
        RETURN;
      ELSE
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason)
          VALUES (t.company_id, t.user_id, 'match_bill_payment', 'bank_transactions', _txn_id,
                   jsonb_build_object('bill_id', best.id, 'bill_number', best.bill_number, 'amount', amt),
                   conf, 'pending', 'Possible match to bill ' || best.bill_number || format(' (%s%% confidence)', round(conf*100)));
        RETURN;
      END IF;
    END IF;
  ELSE
    -- money in: try to match an open invoice
    SELECT i.id, i.invoice_number, i.total, i.currency, c.id AS customer_id, c.name AS customer_name,
      (0.6 * (1 - least(abs(i.total - amt) / greatest(amt, 0.01), 1))
       + 0.4 * coalesce(similarity(coalesce(c.name, ''), t.description), 0)) AS score
    INTO best
    FROM public.invoices i
    LEFT JOIN public.customers c ON c.id = i.customer_id
    WHERE i.company_id = t.company_id AND i.status IN ('sent', 'partial', 'overdue')
      AND abs(i.total - amt) <= greatest(amt * 0.02, 0.02)
    ORDER BY score DESC
    LIMIT 1;

    IF best.id IS NOT NULL THEN
      conf := least(greatest(best.score, 0), 1);
      IF conf >= 0.99 AND best.currency = ba.currency THEN
        INSERT INTO public.payments (company_id, user_id, invoice_id, customer_id, payment_date, amount, currency, method, reference, notes)
          VALUES (t.company_id, t.user_id, best.id, best.customer_id, t.txn_date, amt, ba.currency, 'bank_transfer', t.reference,
                   'Auto-matched by AI Bookkeeper from bank transaction: ' || t.description);
        UPDATE public.bank_transactions SET reconciled = true, matched_type = 'invoice', matched_id = best.id, ai_confidence = conf
          WHERE id = _txn_id;
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason, resolved_at)
          VALUES (t.company_id, t.user_id, 'match_invoice_payment', 'bank_transactions', _txn_id,
                   jsonb_build_object('invoice_id', best.id, 'invoice_number', best.invoice_number, 'amount', amt),
                   conf, 'auto_applied', 'Matched to invoice ' || best.invoice_number || ' — amount and customer name matched', now());
        RETURN;
      ELSIF best.currency <> ba.currency THEN
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason)
          VALUES (t.company_id, t.user_id, 'match_invoice_payment', 'bank_transactions', _txn_id,
                   jsonb_build_object('invoice_id', best.id, 'invoice_number', best.invoice_number, 'amount', amt, 'currency_mismatch', true),
                   conf, 'pending', 'Possible match to invoice ' || best.invoice_number || ', but currencies differ (' || best.currency || ' vs ' || ba.currency || ') — needs a live FX rate before applying');
        RETURN;
      ELSE
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason)
          VALUES (t.company_id, t.user_id, 'match_invoice_payment', 'bank_transactions', _txn_id,
                   jsonb_build_object('invoice_id', best.id, 'invoice_number', best.invoice_number, 'amount', amt),
                   conf, 'pending', 'Possible match to invoice ' || best.invoice_number || format(' (%s%% confidence)', round(conf*100)));
        RETURN;
      END IF;
    END IF;
  END IF;

  -- No bill/invoice candidate at all — fall back to GL categorization,
  -- learned from this company's own history of how similar-described
  -- transactions were categorized before.
  IF t.category_account_id IS NULL THEN
    SELECT category_account_id, max(sim) AS best_sim, count(*) AS freq
      INTO cat_id, cat_conf, cat_reason
      FROM (
        SELECT bt.category_account_id AS category_account_id,
               similarity(bt.description, t.description) AS sim
        FROM public.bank_transactions bt
        WHERE bt.company_id = t.company_id AND bt.id <> t.id AND bt.category_account_id IS NOT NULL
      ) s
      WHERE sim > 0.2
      GROUP BY category_account_id
      ORDER BY max(sim) DESC, count(*) DESC
      LIMIT 1;

    IF cat_id IS NOT NULL THEN
      cat_conf := least(greatest(cat_conf, 0), 1);
      IF cat_conf >= 0.99 THEN
        UPDATE public.bank_transactions SET category_account_id = cat_id, ai_confidence = cat_conf WHERE id = _txn_id;
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason, resolved_at)
          VALUES (t.company_id, t.user_id, 'categorize_transaction', 'bank_transactions', _txn_id,
                   jsonb_build_object('category_account_id', cat_id),
                   cat_conf, 'auto_applied', 'Categorized from a near-identical past transaction', now());
      ELSE
        INSERT INTO public.ai_review_queue (company_id, user_id, task_type, source_table, source_id, proposed, confidence, status, reason)
          VALUES (t.company_id, t.user_id, 'categorize_transaction', 'bank_transactions', _txn_id,
                   jsonb_build_object('category_account_id', cat_id),
                   cat_conf, 'pending', format('Similar to a past transaction categorized this way (%s%% confidence)', round(cat_conf*100)));
      END IF;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Run automatically as new bank transactions arrive (CSV import
--    or manual entry) — "does reconciliation on its own".
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_ai_process_new_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.ai_process_bank_transaction(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bank_transaction_ai ON public.bank_transactions;
CREATE TRIGGER trg_bank_transaction_ai AFTER INSERT ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_ai_process_new_transaction();

-- ------------------------------------------------------------
-- 5. Bulk "run now" for a company (backfill / manual trigger).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_process_pending_transactions(_company_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r RECORD; n int := 0;
BEGIN
  IF NOT public.is_company_member(_company_id) THEN
    RAISE EXCEPTION 'Not permitted for this company';
  END IF;
  FOR r IN
    SELECT id FROM public.bank_transactions
    WHERE company_id = _company_id AND is_transfer = false AND reconciled = false
      AND NOT EXISTS (
        SELECT 1 FROM public.ai_review_queue q
        WHERE q.source_table = 'bank_transactions' AND q.source_id = bank_transactions.id
      )
  LOOP
    PERFORM public.ai_process_bank_transaction(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ai_process_pending_transactions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_process_pending_transactions(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 6. Approve/reject a queued suggestion.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_resolve_review_task(_task_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q RECORD; t RECORD; ba RECORD;
BEGIN
  SELECT * INTO q FROM public.ai_review_queue WHERE id = _task_id AND status = 'pending';
  IF q IS NULL THEN RAISE EXCEPTION 'Task not found or already resolved'; END IF;
  IF NOT public.is_company_member(q.company_id) OR public.get_company_role(q.company_id) = 'viewer' THEN
    RAISE EXCEPTION 'Not permitted for this company';
  END IF;

  IF NOT _approve THEN
    UPDATE public.ai_review_queue SET status='rejected', resolved_at=now(), resolved_by=auth.uid() WHERE id=_task_id;
    RETURN;
  END IF;

  IF q.source_table = 'bank_transactions' THEN
    SELECT * INTO t FROM public.bank_transactions WHERE id = q.source_id;
    IF t IS NULL THEN RAISE EXCEPTION 'Source transaction no longer exists'; END IF;
    SELECT currency INTO ba FROM public.bank_accounts WHERE id = t.bank_account_id;

    IF q.task_type = 'categorize_transaction' THEN
      UPDATE public.bank_transactions
        SET category_account_id = (q.proposed->>'category_account_id')::uuid
        WHERE id = q.source_id;
    ELSIF q.task_type = 'match_bill_payment' THEN
      INSERT INTO public.bill_payments (company_id, user_id, bill_id, payment_date, amount, currency, method, reference, notes)
        VALUES (t.company_id, t.user_id, (q.proposed->>'bill_id')::uuid, t.txn_date, abs(t.amount), ba.currency, 'bank_transfer', t.reference,
                 'Confirmed via AI Bookkeeper review queue');
      UPDATE public.bank_transactions SET reconciled=true, matched_type='bill', matched_id=(q.proposed->>'bill_id')::uuid WHERE id=q.source_id;
    ELSIF q.task_type = 'match_invoice_payment' THEN
      INSERT INTO public.payments (company_id, user_id, invoice_id, payment_date, amount, currency, method, reference, notes)
        VALUES (t.company_id, t.user_id, (q.proposed->>'invoice_id')::uuid, t.txn_date, abs(t.amount), ba.currency, 'bank_transfer', t.reference,
                 'Confirmed via AI Bookkeeper review queue');
      UPDATE public.bank_transactions SET reconciled=true, matched_type='invoice', matched_id=(q.proposed->>'invoice_id')::uuid WHERE id=q.source_id;
    END IF;
  END IF;

  UPDATE public.ai_review_queue SET status='approved', resolved_at=now(), resolved_by=auth.uid() WHERE id=_task_id;
END $$;
REVOKE ALL ON FUNCTION public.ai_resolve_review_task(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_resolve_review_task(uuid, boolean) TO authenticated;
