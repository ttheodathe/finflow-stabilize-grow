
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  quantity_change NUMERIC NOT NULL,
  balance_after NUMERIC,
  reason TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own stock movements"
  ON public.stock_movements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_stock_movements_item ON public.stock_movements(item_id, created_at DESC);
CREATE INDEX idx_stock_movements_user ON public.stock_movements(user_id, created_at DESC);

-- Update inventory function to log movements
CREATE OR REPLACE FUNCTION public.apply_invoice_stock(_invoice_id uuid, _direction integer, _reason text DEFAULT 'invoice_paid')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  new_balance NUMERIC;
BEGIN
  FOR r IN
    SELECT ii.item_id, SUM(ii.quantity) AS qty, i.user_id, i.invoice_number
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    JOIN public.items it ON it.id = ii.item_id
    WHERE ii.invoice_id = _invoice_id
      AND ii.item_id IS NOT NULL
      AND it.type = 'product'
      AND it.track_inventory = true
    GROUP BY ii.item_id, i.user_id, i.invoice_number
  LOOP
    UPDATE public.items
       SET stock_quantity = stock_quantity - (_direction * r.qty)
     WHERE id = r.item_id
     RETURNING stock_quantity INTO new_balance;

    INSERT INTO public.stock_movements (user_id, item_id, invoice_id, quantity_change, balance_after, reason, note)
    VALUES (r.user_id, r.item_id, _invoice_id, -(_direction * r.qty), new_balance, _reason, 'Invoice ' || r.invoice_number);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_invoice_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'paid' THEN
      PERFORM public.apply_invoice_stock(NEW.id, 1, 'invoice_paid');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
        PERFORM public.apply_invoice_stock(NEW.id, 1, 'invoice_paid');
      ELSIF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
        PERFORM public.apply_invoice_stock(NEW.id, -1, 'invoice_reversed');
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'paid' THEN
      PERFORM public.apply_invoice_stock(OLD.id, -1, 'invoice_deleted');
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;
