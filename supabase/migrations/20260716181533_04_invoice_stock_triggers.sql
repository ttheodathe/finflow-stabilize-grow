
CREATE OR REPLACE FUNCTION public.apply_invoice_stock(_invoice_id uuid, _direction int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.items i
  SET stock_quantity = i.stock_quantity - (_direction * agg.qty)
  FROM (
    SELECT ii.item_id, SUM(ii.quantity) AS qty
    FROM public.invoice_items ii
    WHERE ii.invoice_id = _invoice_id AND ii.item_id IS NOT NULL
    GROUP BY ii.item_id
  ) agg
  WHERE i.id = agg.item_id
    AND i.type = 'product'
    AND i.track_inventory = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_invoice_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'paid' THEN
      PERFORM public.apply_invoice_stock(NEW.id, 1);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
        PERFORM public.apply_invoice_stock(NEW.id, 1);
      ELSIF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
        PERFORM public.apply_invoice_stock(NEW.id, -1);
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'paid' THEN
      PERFORM public.apply_invoice_stock(OLD.id, -1);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_stock_ins ON public.invoices;
DROP TRIGGER IF EXISTS trg_invoice_stock_upd ON public.invoices;
DROP TRIGGER IF EXISTS trg_invoice_stock_del ON public.invoices;

CREATE TRIGGER trg_invoice_stock_ins
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_stock();

CREATE TRIGGER trg_invoice_stock_upd
AFTER UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_stock();

CREATE TRIGGER trg_invoice_stock_del
BEFORE DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_stock();
