-- Invoice status changes (paid -> sent/overdue, etc.) must not delete and
-- recreate posted revenue/receivable journals. Repost only when a field used
-- by the journal itself changes.
CREATE OR REPLACE FUNCTION public.handle_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (
      OLD.company_id,
      OLD.user_id,
      OLD.issue_date,
      OLD.invoice_number,
      OLD.total,
      OLD.base_currency_amount
    ) IS DISTINCT FROM (
      NEW.company_id,
      NEW.user_id,
      NEW.issue_date,
      NEW.invoice_number,
      NEW.total,
      NEW.base_currency_amount
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
