-- Keep invoice ledger posting consistent with the invoice's tax-inclusive total.
-- Sales tax is a liability, not sales revenue. All journal lines are recorded
-- in the company's base currency using the invoice's locked exchange rate.
--
-- This migration follows 20261126093000_dedupe_invoice_stock_triggers.sql.
-- Apply pending migrations in timestamp order so the status transition from
-- draft -> sent posts the invoice after invoice_items have been inserted.

CREATE OR REPLACE FUNCTION public.post_invoice_journal(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  inv record;
  ar_id uuid;
  rev_id uuid;
  tax_id uuid;
  entry_id uuid;
  base_total numeric;
  base_tax numeric;
  base_revenue numeric;
  fx_rate numeric;
BEGIN
  SELECT *
    INTO inv
    FROM public.invoices
   WHERE id = _invoice_id;

  IF NOT FOUND OR inv.status = 'draft' THEN
    RETURN;
  END IF;

  ar_id := public.find_account_by_company(inv.company_id, '1100');
  rev_id := public.find_account_by_company(inv.company_id, '4000');

  IF ar_id IS NULL OR rev_id IS NULL THEN
    RAISE EXCEPTION 'Invoice posting requires Accounts Receivable (1100) and Sales Revenue (4000) accounts for company %', inv.company_id;
  END IF;

  fx_rate := COALESCE(NULLIF(inv.exchange_rate, 0), 1);
  base_total := COALESCE(
    inv.base_currency_amount,
    round(COALESCE(inv.total, 0) * fx_rate, 2)
  );

  IF base_total = 0 THEN
    RETURN;
  END IF;

  base_tax := round(COALESCE(inv.tax, 0) * fx_rate, 2);
  base_revenue := round(base_total - base_tax, 2);

  IF base_tax < 0 OR base_revenue < 0 THEN
    RAISE EXCEPTION 'Invoice % has invalid totals for tax-aware ledger posting', inv.invoice_number;
  END IF;

  IF base_tax > 0 THEN
    tax_id := public.find_account_by_company(inv.company_id, '2100');
    IF tax_id IS NULL THEN
      RAISE EXCEPTION 'Invoice % includes tax but company % has no active Sales Tax Payable (2100) account', inv.invoice_number, inv.company_id;
    END IF;
  END IF;

  INSERT INTO public.journal_entries (
    company_id,
    user_id,
    entry_date,
    reference,
    memo,
    source_type,
    source_id,
    is_posted
  )
  VALUES (
    inv.company_id,
    inv.user_id,
    inv.issue_date,
    inv.invoice_number,
    'Invoice issued',
    'invoice',
    inv.id,
    true
  )
  RETURNING id INTO entry_id;

  INSERT INTO public.journal_lines (
    company_id,
    user_id,
    entry_id,
    account_id,
    debit,
    credit,
    description
  )
  VALUES (
    inv.company_id,
    inv.user_id,
    entry_id,
    ar_id,
    base_total,
    0,
    'Accounts receivable'
  );

  IF base_revenue > 0 THEN
    INSERT INTO public.journal_lines (
      company_id,
      user_id,
      entry_id,
      account_id,
      debit,
      credit,
      description
    )
    VALUES (
      inv.company_id,
      inv.user_id,
      entry_id,
      rev_id,
      0,
      base_revenue,
      'Sales revenue excluding tax'
    );
  END IF;

  IF base_tax > 0 THEN
    INSERT INTO public.journal_lines (
      company_id,
      user_id,
      entry_id,
      account_id,
      debit,
      credit,
      description
    )
    VALUES (
      inv.company_id,
      inv.user_id,
      entry_id,
      tax_id,
      0,
      base_tax,
      'Sales tax payable'
    );
  END IF;
END;
$function$;

-- Repost only when a field that affects the invoice journal changes.
-- Status is included so draft -> sent posts after invoice lines are persisted;
-- subtotal/tax/currency/rate are included so edits cannot leave stale entries.
CREATE OR REPLACE FUNCTION public.handle_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      PERFORM public.post_invoice_journal(NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (
      OLD.company_id,
      OLD.user_id,
      OLD.issue_date,
      OLD.invoice_number,
      OLD.currency,
      OLD.subtotal,
      OLD.tax,
      OLD.total,
      OLD.exchange_rate,
      OLD.base_currency_amount,
      OLD.status
    ) IS DISTINCT FROM (
      NEW.company_id,
      NEW.user_id,
      NEW.issue_date,
      NEW.invoice_number,
      NEW.currency,
      NEW.subtotal,
      NEW.tax,
      NEW.total,
      NEW.exchange_rate,
      NEW.base_currency_amount,
      NEW.status
    ) THEN
      DELETE FROM public.journal_entries
       WHERE company_id = OLD.company_id
         AND source_type = 'invoice'
         AND source_id = OLD.id;

      PERFORM public.post_invoice_journal(NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'invoice'
       AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;
