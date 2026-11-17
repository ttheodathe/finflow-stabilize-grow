
REVOKE EXECUTE ON FUNCTION public.apply_invoice_stock(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_invoice_stock() FROM PUBLIC, anon, authenticated;
