
CREATE OR REPLACE FUNCTION public.handle_invoice_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  committed_statuses text[] := ARRAY['sent','paid','overdue'];
  old_committed boolean;
  new_committed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = ANY(committed_statuses) THEN
      PERFORM public.apply_invoice_stock(NEW.id, 1, 'invoice_' || NEW.status);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_committed := OLD.status = ANY(committed_statuses);
    new_committed := NEW.status = ANY(committed_statuses);
    IF new_committed AND NOT old_committed THEN
      PERFORM public.apply_invoice_stock(NEW.id, 1, 'invoice_' || NEW.status);
    ELSIF old_committed AND NOT new_committed THEN
      PERFORM public.apply_invoice_stock(NEW.id, -1, 'invoice_reversed');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = ANY(committed_statuses) THEN
      PERFORM public.apply_invoice_stock(OLD.id, -1, 'invoice_deleted');
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_invoice_stock ON public.invoices;
CREATE TRIGGER trg_invoice_stock
AFTER INSERT OR UPDATE OF status OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_stock();
