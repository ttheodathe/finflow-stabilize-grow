-- Stage A.6: enforce credit-note parent integrity and atomic bank-transfer ledger ownership.

CREATE OR REPLACE FUNCTION public.validate_credit_note_tenant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_invoice record;
BEGIN
  IF NEW.company_id IS NULL OR NEW.invoice_id IS NULL THEN
    RAISE EXCEPTION 'Credit note company and invoice are required';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0
     OR NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Credit note amount and exchange rate must be positive';
  END IF;

  SELECT i.company_id, i.currency, i.customer_id
    INTO v_invoice
    FROM public.invoices i
   WHERE i.id = NEW.invoice_id
   FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note invoice does not exist';
  END IF;
  IF v_invoice.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Credit note and invoice must belong to the same company';
  END IF;
  IF NEW.currency IS DISTINCT FROM v_invoice.currency THEN
    RAISE EXCEPTION 'Credit note currency must match invoice currency';
  END IF;

  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := v_invoice.customer_id;
  ELSIF v_invoice.customer_id IS NOT NULL
     AND NEW.customer_id IS DISTINCT FROM v_invoice.customer_id THEN
    RAISE EXCEPTION 'Credit note customer must match invoice customer';
  END IF;

  IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers c
     WHERE c.id = NEW.customer_id
       AND c.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Credit note customer does not belong to this company';
  END IF;

  IF NEW.base_currency_amount IS NULL THEN
    NEW.base_currency_amount := round(NEW.amount * NEW.exchange_rate, 2);
  END IF;
  IF NEW.base_currency_amount <= 0 THEN
    RAISE EXCEPTION 'Credit note base-currency amount must be positive';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_credit_note_tenant_integrity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_validate_credit_note_tenant_integrity ON public.credit_notes;
CREATE TRIGGER trg_validate_credit_note_tenant_integrity
BEFORE INSERT OR UPDATE ON public.credit_notes
FOR EACH ROW EXECUTE FUNCTION public.validate_credit_note_tenant_integrity();

CREATE OR REPLACE FUNCTION public.handle_credit_note_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'issued' THEN
      PERFORM public.post_credit_note_journal(NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'credit_note'
       AND source_id = OLD.id;
    IF NEW.status = 'issued' THEN
      PERFORM public.post_credit_note_journal(NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.journal_entries
     WHERE company_id = OLD.company_id
       AND source_type = 'credit_note'
       AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_bank_transfer_tenant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_from public.bank_accounts%ROWTYPE;
  v_to public.bank_accounts%ROWTYPE;
BEGIN
  IF NEW.company_id IS NULL OR NEW.amount IS NULL OR NEW.amount <= 0
     OR NEW.from_account_id IS NULL OR NEW.to_account_id IS NULL
     OR NEW.from_account_id = NEW.to_account_id THEN
    RAISE EXCEPTION 'Transfer requires a company, positive amount, and two different accounts';
  END IF;

  SELECT * INTO v_from
    FROM public.bank_accounts
   WHERE id = NEW.from_account_id
   FOR KEY SHARE;
  IF NOT FOUND OR NOT v_from.is_active OR v_from.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Transfer source account must be active and belong to the transfer company';
  END IF;

  SELECT * INTO v_to
    FROM public.bank_accounts
   WHERE id = NEW.to_account_id
   FOR KEY SHARE;
  IF NOT FOUND OR NOT v_to.is_active OR v_to.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Transfer destination account must be active and belong to the transfer company';
  END IF;

  IF v_from.currency IS DISTINCT FROM v_to.currency THEN
    RAISE EXCEPTION 'Transfers between different currencies are not supported';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_bank_transfer_tenant_integrity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_validate_bank_transfer_tenant_integrity ON public.bank_transfers;
CREATE TRIGGER trg_validate_bank_transfer_tenant_integrity
BEFORE INSERT OR UPDATE ON public.bank_transfers
FOR EACH ROW EXECUTE FUNCTION public.validate_bank_transfer_tenant_integrity();

-- Each transfer may have exactly one ledger row for each endpoint account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_transfer_account_unique
  ON public.bank_transactions (bank_transfer_id, bank_account_id)
  WHERE bank_transfer_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_bank_transaction_tenant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_transfer record;
BEGIN
  IF NEW.company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.bank_accounts ba
     WHERE ba.id = NEW.bank_account_id
       AND ba.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Bank transaction account must belong to the transaction company';
  END IF;

  IF NEW.category_account_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.category_account_id IS DISTINCT FROM OLD.category_account_id
          OR NEW.company_id IS DISTINCT FROM OLD.company_id)
     AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
     WHERE a.id = NEW.category_account_id
       AND a.is_active = true
       AND (a.company_id = NEW.company_id OR (a.company_id IS NULL AND a.is_system = true))
  ) THEN
    RAISE EXCEPTION 'Bank transaction category account is invalid for this company';
  END IF;

  IF NEW.bank_transfer_id IS NOT NULL THEN
    SELECT bt.company_id, bt.from_account_id, bt.to_account_id, bt.amount
      INTO v_transfer
      FROM public.bank_transfers bt
     WHERE bt.id = NEW.bank_transfer_id
     FOR KEY SHARE;
    IF NOT FOUND OR v_transfer.company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Bank transfer reference does not belong to this company';
    END IF;
    IF NOT (
      (NEW.bank_account_id = v_transfer.from_account_id AND NEW.amount = -v_transfer.amount)
      OR
      (NEW.bank_account_id = v_transfer.to_account_id AND NEW.amount = v_transfer.amount)
    ) THEN
      RAISE EXCEPTION 'Transfer ledger row must match one endpoint and its signed amount';
    END IF;
    IF NEW.is_transfer IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Rows linked to a bank transfer must be marked as transfers';
    END IF;
  ELSIF NEW.is_transfer IS TRUE THEN
    RAISE EXCEPTION 'Transfer transactions must reference a company-owned bank transfer';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_bank_transaction_tenant_integrity() FROM PUBLIC, anon, authenticated;

-- Transfer creation is exclusively through create_bank_transfer(), which writes
-- the parent and both ledger rows in one transaction. Keep admin DELETE for the
-- existing UI; its FK cascade invokes the balance-reversal trigger for both rows.
REVOKE ALL ON TABLE public.bank_transfers FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.bank_transfers TO authenticated;
