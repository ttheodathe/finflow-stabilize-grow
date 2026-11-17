-- ============================================================
-- Engagement reminders: nudges companies toward features they
-- haven't used yet or have gone quiet on (create an invoice, track
-- an expense, reconcile the bank, chase an overdue invoice, pay a
-- bill before it's late). Delivered through the notifications
-- table your bell icon already reads — no new UI needed.
--
-- Respects the existing notification_preferences.reminder_notifications
-- flag (already in your schema, never wired to anything until now).
-- Each reminder type fires at most once every 3 days per company,
-- so a company that ignores a nudge doesn't get spammed daily.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.company_wants_reminders(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(
    (SELECT reminder_notifications FROM public.notification_preferences
       WHERE company_id = _company_id AND user_id = _user_id),
    true -- no row yet = default on, matching the column's own default
  );
$$;

CREATE OR REPLACE FUNCTION public.maybe_notify_reminder(
  _company_id uuid, _user_id uuid, _type text, _title text, _body text, _link text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.company_wants_reminders(_company_id, _user_id) THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE company_id = _company_id AND type = _type AND created_at > now() - interval '3 days'
  ) THEN RETURN; END IF;
  INSERT INTO public.notifications (company_id, user_id, type, title, body, link)
    VALUES (_company_id, _user_id, _type, _title, _body, _link);
END $$;

CREATE OR REPLACE FUNCTION public.check_engagement_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c RECORD; n int := 0;
BEGIN
  FOR c IN SELECT id, user_id, name, created_at FROM public.companies LOOP
    n := n + 1;

    -- Invoicing: never sent one (after a day's grace period), or gone
    -- quiet for two weeks.
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE company_id = c.id) THEN
      IF c.created_at < now() - interval '1 day' THEN
        PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_first_invoice',
          'Create your first invoice',
          'Bill a customer directly from FinFlowTrack and start tracking revenue.',
          '/invoices');
      END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM public.invoices WHERE company_id = c.id AND issue_date > current_date - 14) THEN
      PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_invoice_inactivity',
        'It''s been a while since your last invoice',
        'Keep your revenue tracking current — create an invoice for any recent work.',
        '/invoices');
    END IF;

    -- Expenses: never logged one, or gone quiet for two weeks.
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE company_id = c.id) THEN
      IF c.created_at < now() - interval '1 day' THEN
        PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_first_expense',
          'Track your first expense',
          'Log a business expense to see accurate profit and tax-ready books.',
          '/expenses');
      END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM public.expenses WHERE company_id = c.id AND expense_date > current_date - 14) THEN
      PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_expense_inactivity',
        'No expenses logged recently',
        'It''s been two weeks since your last expense — add any you''ve missed.',
        '/expenses');
    END IF;

    -- Overdue invoices sitting unpaid for a week or more.
    IF EXISTS (
      SELECT 1 FROM public.invoices
      WHERE company_id = c.id AND status IN ('sent','partial','overdue') AND due_date < current_date - 7
    ) THEN
      PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_overdue_invoices',
        'You have overdue invoices',
        'One or more invoices are more than a week past due — consider sending a follow-up.',
        '/sales/payments');
    END IF;

    -- Bills due soon or already overdue and still unpaid.
    IF EXISTS (
      SELECT 1 FROM public.bills WHERE company_id = c.id AND status IN ('open','partial') AND due_date < current_date + 3
    ) THEN
      PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_bills_due',
        'A bill is due soon',
        'You have a vendor bill due within 3 days (or already overdue) that''s still unpaid.',
        '/purchases/bills');
    END IF;

    -- Bank transactions sitting unreconciled for two weeks or more.
    IF EXISTS (
      SELECT 1 FROM public.bank_transactions
      WHERE company_id = c.id AND reconciled = false AND is_transfer = false AND txn_date < current_date - 14
    ) THEN
      PERFORM public.maybe_notify_reminder(c.id, c.user_id, 'reminder_bank_reconciliation',
        'Bank transactions need reconciling',
        'Some bank transactions from two+ weeks ago are still unreconciled — the AI Bookkeeper can help.',
        '/ai-bookkeeper');
    END IF;
  END LOOP;
  RETURN n;
END $$;

-- Run once a day at 08:00 UTC. Re-scheduling is safe: unschedule
-- first so re-running this migration doesn't create a duplicate job.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'engagement-reminders-daily';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('engagement-reminders-daily', '0 8 * * *', $$SELECT public.check_engagement_reminders()$$);
