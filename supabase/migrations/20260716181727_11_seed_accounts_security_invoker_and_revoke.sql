
CREATE OR REPLACE FUNCTION public.seed_default_accounts(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
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

-- Balance check must remain SECURITY DEFINER because it reads across rows during a mutation;
-- restrict who can call it directly (only the trigger uses it).
REVOKE ALL ON FUNCTION public.check_journal_balance() FROM PUBLIC, anon, authenticated;
