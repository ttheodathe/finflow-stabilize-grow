-- Restrict direct manual journal creation/editing and manual reversals to
-- company owners, admins and accountants. Other business workflows continue
-- to create source-linked journals through their trusted SECURITY DEFINER RPCs.

DROP POLICY IF EXISTS "company members insert" ON public.journal_entries;
CREATE POLICY "company members insert" ON public.journal_entries
  FOR INSERT TO public
  WITH CHECK (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role
    )
  );

DROP POLICY IF EXISTS "company members update" ON public.journal_entries;
CREATE POLICY "company members update" ON public.journal_entries
  FOR UPDATE TO public
  USING (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role
    )
  )
  WITH CHECK (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role
    )
  );

DROP POLICY IF EXISTS "company members insert" ON public.journal_lines;
CREATE POLICY "company members insert" ON public.journal_lines
  FOR INSERT TO public
  WITH CHECK (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role
    )
  );

DROP POLICY IF EXISTS "company members update" ON public.journal_lines;
CREATE POLICY "company members update" ON public.journal_lines
  FOR UPDATE TO public
  USING (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role
    )
  )
  WITH CHECK (
    public.is_company_member(company_id)
    AND public.get_company_role(company_id) IN (
      'owner'::public.company_member_role,
      'admin'::public.company_member_role,
      'accountant'::public.company_member_role
    )
  );

CREATE OR REPLACE FUNCTION public.void_manual_journal_entry(p_entry_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_entry public.journal_entries%ROWTYPE;
  v_reversal_id uuid;
  v_line_count integer;
  v_actor_role public.company_member_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_entry
    FROM public.journal_entries
   WHERE id = p_entry_id
   FOR UPDATE;

  IF NOT FOUND OR NOT v_entry.is_posted OR v_entry.source_type <> 'manual'
     OR v_entry.voided_at IS NOT NULL
     OR v_entry.reversed_by_entry_id IS NOT NULL
     OR v_entry.reverses_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only an active posted manual journal entry can be voided';
  END IF;

  v_actor_role := public.get_company_role(v_entry.company_id);
  IF NOT public.is_company_member(v_entry.company_id)
     OR v_actor_role IS NULL
     OR v_actor_role NOT IN (
       'owner'::public.company_member_role,
       'admin'::public.company_member_role,
       'accountant'::public.company_member_role
     ) THEN
    RAISE EXCEPTION 'Not permitted to void this journal entry';
  END IF;

  PERFORM public.assert_journal_entry_balanced(v_entry.id);

  SELECT pg_catalog.count(*) INTO v_line_count
    FROM public.journal_lines
   WHERE entry_id = v_entry.id;

  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Journal entry has no valid lines to reverse';
  END IF;

  INSERT INTO public.journal_entries (
    company_id, user_id, entry_date, reference, memo, source_type,
    reverses_entry_id, is_posted
  )
  VALUES (
    v_entry.company_id, auth.uid(), CURRENT_DATE,
    CASE WHEN v_entry.reference IS NULL THEN NULL ELSE v_entry.reference || '-VOID' END,
    'Reversal of ' || COALESCE(v_entry.reference, v_entry.id::text)
      || CASE WHEN v_entry.memo IS NULL THEN '' ELSE ': ' || v_entry.memo END,
    'reversal', v_entry.id, false
  )
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_lines (
    company_id, user_id, entry_id, account_id, debit, credit, description
  )
  SELECT
    v_entry.company_id, auth.uid(), v_reversal_id, jl.account_id,
    jl.credit, jl.debit,
    CASE WHEN jl.description IS NULL THEN 'Reversal' ELSE 'Reversal: ' || jl.description END
  FROM public.journal_lines jl
  WHERE jl.entry_id = v_entry.id;

  UPDATE public.journal_entries
     SET is_posted = true
   WHERE id = v_reversal_id;

  UPDATE public.journal_entries
     SET voided_at = pg_catalog.now(),
         voided_by = auth.uid(),
         reversed_by_entry_id = v_reversal_id
   WHERE id = v_entry.id;

  RETURN v_reversal_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.void_manual_journal_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_manual_journal_entry(uuid) TO authenticated;
