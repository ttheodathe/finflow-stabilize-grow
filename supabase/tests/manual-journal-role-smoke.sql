\set ON_ERROR_STOP on
BEGIN;

-- Seed a posted manual entry and a draft as the fixture owner.
INSERT INTO public.journal_entries (company_id,user_id,reference,memo,source_type,is_posted)
VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','JE-VOID-1','posted manual','manual',true)
RETURNING id AS posted_entry_id \gset
INSERT INTO public.journal_lines (company_id,user_id,entry_id,account_id,debit,credit)
VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',:'posted_entry_id'::uuid,'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',100,0),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',:'posted_entry_id'::uuid,'cccccccc-cccc-cccc-cccc-cccccccccccc',0,100);

INSERT INTO public.journal_entries (company_id,user_id,reference,memo,source_type,is_posted)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','JE-DRAFT-1','draft manual','manual',false)
RETURNING id AS draft_entry_id \gset

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
SELECT set_config('request.test_role','sales',true);
SELECT set_config('request.test_posted_entry',:'posted_entry_id',true);
SELECT set_config('request.test_draft_entry',:'draft_entry_id',true);

DO $$
DECLARE
  affected integer;
BEGIN
  BEGIN
    INSERT INTO public.journal_entries (company_id,user_id,reference,source_type,is_posted)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',auth.uid(),'SALES-ENTRY','manual',false);
    RAISE EXCEPTION 'sales role unexpectedly inserted a journal entry';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public.journal_entries
     SET memo='unauthorized sales edit'
   WHERE id=current_setting('request.test_draft_entry')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'sales role unexpectedly updated a journal entry';
  END IF;

  BEGIN
    PERFORM public.void_manual_journal_entry(current_setting('request.test_posted_entry')::uuid);
    RAISE EXCEPTION 'sales role unexpectedly voided a manual journal entry';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Not permitted to void this journal entry' THEN
      RAISE;
    END IF;
  END;
END;
$$;

SELECT set_config('request.test_role','accountant',true);
INSERT INTO public.journal_entries (company_id,user_id,reference,source_type,is_posted)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',auth.uid(),'ACCOUNTANT-ENTRY','manual',false);

UPDATE public.journal_entries
   SET memo='authorized accountant edit'
 WHERE id=current_setting('request.test_draft_entry')::uuid;

DO $$
DECLARE
  v_reversal uuid;
BEGIN
  v_reversal := public.void_manual_journal_entry(current_setting('request.test_posted_entry')::uuid);
  IF v_reversal IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE id=current_setting('request.test_posted_entry')::uuid
      AND voided_at IS NOT NULL
      AND reversed_by_entry_id=v_reversal
  ) THEN
    RAISE EXCEPTION 'accountant could not complete an authorized journal reversal';
  END IF;
END;
$$;

ROLLBACK;
SELECT 'manual journal role authorization tests passed' AS result;
