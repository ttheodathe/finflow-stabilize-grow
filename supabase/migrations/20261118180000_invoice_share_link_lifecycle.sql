-- Existing share links remain valid: the new lifecycle fields are NULL for existing rows.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS share_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_token_revoked_at timestamptz;

-- The default expiry is applied after the new invoice UI is deployed.

CREATE OR REPLACE FUNCTION public.get_public_invoice(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'invoice_number', i.invoice_number,
    'issue_date', i.issue_date,
    'due_date', i.due_date,
    'status', i.status,
    'currency', i.currency,
    'subtotal', i.subtotal,
    'tax', i.tax,
    'total', i.total,
    'notes', i.notes,
    'customer_name', c.name,
    'company_name', co.name,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'description', li.description,
            'quantity', li.quantity,
            'unit_price', li.unit_price,
            'amount', li.amount
          )
          ORDER BY li.created_at
        )
        FROM public.invoice_items li
        WHERE li.invoice_id = i.id
      ),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.invoices i
  LEFT JOIN public.customers c ON c.id = i.customer_id
  LEFT JOIN public.companies co ON co.id = i.company_id
  WHERE i.share_token = p_token
    AND i.status <> 'draft'
    AND i.share_token_revoked_at IS NULL
    AND (
      i.share_token_expires_at IS NULL
      OR i.share_token_expires_at > pg_catalog.now()
    );

  RETURN result;
END;
$function$;
