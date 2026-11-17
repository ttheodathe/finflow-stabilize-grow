-- Stage A.6: scope inventory journal replacement to its tenant and fail closed.
-- This helper is not executable by anon/authenticated; inventory wrappers call it
-- within their transaction after validating the tenant and actor.
CREATE OR REPLACE FUNCTION public.post_inventory_journal_entry(
  p_company_id uuid,
  p_user_id uuid,
  p_debit_account_id uuid,
  p_credit_account_id uuid,
  p_amount numeric,
  p_memo text,
  p_source_type text,
  p_source_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_entry_id uuid;
  v_amount numeric;
BEGIN
  IF p_company_id IS NULL OR p_user_id IS NULL
     OR p_source_type IS NULL OR pg_catalog.btrim(p_source_type) = ''
     OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'Inventory journal requires company, actor, source type and source id';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Inventory journal amount must be zero or positive';
  END IF;

  v_amount := pg_catalog.round(p_amount, 2);

  IF v_amount > 0 THEN
    IF p_debit_account_id IS NULL OR p_credit_account_id IS NULL
       OR p_debit_account_id = p_credit_account_id THEN
      RAISE EXCEPTION 'A positive inventory journal requires two different accounts';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.accounts a
       WHERE a.id = p_debit_account_id
         AND a.company_id = p_company_id
         AND a.is_active = true
    ) THEN
      RAISE EXCEPTION 'Debit account is inactive or does not belong to this company';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.accounts a
       WHERE a.id = p_credit_account_id
         AND a.company_id = p_company_id
         AND a.is_active = true
    ) THEN
      RAISE EXCEPTION 'Credit account is inactive or does not belong to this company';
    END IF;
  END IF;

  -- Never let one tenant's source identifier delete another tenant's journal.
  DELETE FROM public.journal_entries
   WHERE company_id = p_company_id
     AND source_type = p_source_type
     AND source_id = p_source_id;

  -- Zero-value movements do not create a journal entry.
  IF v_amount = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.journal_entries (
    company_id, user_id, entry_date, memo, source_type, source_id, is_posted
  )
  VALUES (
    p_company_id, p_user_id, pg_catalog.current_date, p_memo, p_source_type, p_source_id, true
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines (
    company_id, user_id, entry_id, account_id, debit, credit, description
  )
  VALUES
    (p_company_id, p_user_id, v_entry_id, p_debit_account_id, v_amount, 0, p_memo),
    (p_company_id, p_user_id, v_entry_id, p_credit_account_id, 0, v_amount, p_memo);

  RETURN v_entry_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.post_inventory_journal_entry(uuid, uuid, uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;
