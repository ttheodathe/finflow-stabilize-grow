
-- Account type enum
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','revenue','expense');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Accounts
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type public.account_type NOT NULL,
  parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own accounts" ON public.accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Journal entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  reference text,
  memo text,
  source_type text,
  source_id uuid,
  is_posted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own journal entries" ON public.journal_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX journal_entries_user_date_idx ON public.journal_entries(user_id, entry_date DESC);

-- Journal lines
CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own journal lines" ON public.journal_lines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX journal_lines_entry_idx ON public.journal_lines(entry_id);
CREATE INDEX journal_lines_account_idx ON public.journal_lines(account_id);

-- Balance check trigger (deferred until statement end so multi-row inserts work)
CREATE OR REPLACE FUNCTION public.check_journal_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  eid uuid;
  d numeric;
  c numeric;
  posted boolean;
BEGIN
  eid := COALESCE(NEW.entry_id, OLD.entry_id);
  SELECT is_posted INTO posted FROM public.journal_entries WHERE id = eid;
  IF NOT COALESCE(posted, false) THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO d, c
    FROM public.journal_lines WHERE entry_id = eid;
  IF ROUND(d, 2) <> ROUND(c, 2) THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: debits=% credits=%', eid, d, c;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER journal_lines_balance_check
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_journal_balance();

-- Seed default accounts
CREATE OR REPLACE FUNCTION public.seed_default_accounts(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.accounts WHERE user_id = _user_id) THEN RETURN; END IF;
  INSERT INTO public.accounts (user_id, code, name, type, is_system, description) VALUES
    (_user_id,'1000','Cash','asset',true,'Cash on hand'),
    (_user_id,'1010','Bank account','asset',true,'Primary bank account'),
    (_user_id,'1100','Accounts receivable','asset',true,'Money owed by customers'),
    (_user_id,'1200','Inventory','asset',true,'Goods held for sale'),
    (_user_id,'1500','Fixed assets','asset',true,'Equipment, property, vehicles'),
    (_user_id,'2000','Accounts payable','liability',true,'Money owed to vendors'),
    (_user_id,'2100','Sales tax payable','liability',true,'Tax collected from sales'),
    (_user_id,'2200','Credit card','liability',true,'Credit card balance'),
    (_user_id,'2500','Loans payable','liability',true,'Outstanding loans'),
    (_user_id,'3000','Owner equity','equity',true,'Owner capital'),
    (_user_id,'3100','Retained earnings','equity',true,'Accumulated profits'),
    (_user_id,'3200','Owner draws','equity',true,'Owner withdrawals'),
    (_user_id,'4000','Sales revenue','revenue',true,'Income from sales'),
    (_user_id,'4100','Service revenue','revenue',true,'Income from services'),
    (_user_id,'4900','Other income','revenue',true,'Miscellaneous income'),
    (_user_id,'5000','Cost of goods sold','expense',true,'Direct cost of products sold'),
    (_user_id,'6000','Rent','expense',true,'Office and facility rent'),
    (_user_id,'6100','Utilities','expense',true,'Electricity, water, internet'),
    (_user_id,'6200','Salaries and wages','expense',true,'Employee compensation'),
    (_user_id,'6300','Office supplies','expense',true,'Consumables and supplies'),
    (_user_id,'6400','Software and subscriptions','expense',true,'SaaS and software'),
    (_user_id,'6500','Marketing and advertising','expense',true,'Promotion costs'),
    (_user_id,'6600','Travel','expense',true,'Business travel'),
    (_user_id,'6700','Meals and entertainment','expense',true,'Business meals'),
    (_user_id,'6800','Professional fees','expense',true,'Legal, accounting, consulting'),
    (_user_id,'6900','Bank fees','expense',true,'Bank charges and interest'),
    (_user_id,'7000','Depreciation','expense',true,'Asset depreciation'),
    (_user_id,'7900','Other expenses','expense',true,'Miscellaneous expenses');
END $$;

GRANT EXECUTE ON FUNCTION public.seed_default_accounts(uuid) TO authenticated;
