-- Stage A.6: serialize company creation and make default-company preference user-scoped.

CREATE TABLE IF NOT EXISTS public.user_company_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_company_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_company_preferences FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_default_company(p_company_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.company_members cm
     WHERE cm.company_id=p_company_id AND cm.user_id=v_uid AND cm.status='active'
  ) THEN RAISE EXCEPTION 'You are not an active member of this company'; END IF;
  INSERT INTO public.user_company_preferences(user_id,company_id)
  VALUES(v_uid,p_company_id)
  ON CONFLICT(user_id) DO UPDATE SET company_id=EXCLUDED.company_id,updated_at=pg_catalog.now();
  RETURN p_company_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_default_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_default_company(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_default_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $function$
  SELECT pref.company_id
    FROM public.user_company_preferences pref
    JOIN public.company_members cm ON cm.company_id=pref.company_id
      AND cm.user_id=pref.user_id AND cm.status='active'
   WHERE pref.user_id=auth.uid()
  UNION ALL
  SELECT cm.company_id FROM public.company_members cm
   WHERE cm.user_id=auth.uid() AND cm.status='active'
     AND NOT EXISTS (SELECT 1 FROM public.user_company_preferences pref WHERE pref.user_id=auth.uid())
   ORDER BY 1 LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.get_default_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_default_company_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_company(
  p_name text,p_email text DEFAULT NULL::text,p_address text DEFAULT NULL::text,
  p_currency text DEFAULT 'USD'::text,p_organization_id uuid DEFAULT NULL::uuid,
  p_phone text DEFAULT NULL::text,p_website text DEFAULT NULL::text,p_city text DEFAULT NULL::text,
  p_state text DEFAULT NULL::text,p_postal_code text DEFAULT NULL::text,p_country text DEFAULT NULL::text,
  p_tax_number text DEFAULT NULL::text
)
RETURNS public.companies LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_uid uuid:=auth.uid(); v_org_id uuid; v_plan text; v_status text;
  v_max_companies integer; v_owned_count integer; v_new_company public.companies;
  v_owner_role_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM 1 FROM auth.users u WHERE u.id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated user record not found'; END IF;
  IF p_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_name))=0 THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;
  INSERT INTO public.profiles(id,email)
  SELECT v_uid,u.email FROM auth.users u WHERE u.id=v_uid
  ON CONFLICT(id) DO NOTHING;
  SELECT r.id INTO v_owner_role_id FROM public.roles r
   WHERE r.key='owner' AND r.company_id IS NULL AND r.is_system=true LIMIT 1;
  IF v_owner_role_id IS NULL THEN RAISE EXCEPTION 'System owner role is not configured'; END IF;
  IF p_organization_id IS NOT NULL THEN
    SELECT o.id INTO v_org_id FROM public.organizations o
     WHERE o.id=p_organization_id AND o.owner_id=v_uid AND o.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'You do not own an active organization'; END IF;
  ELSE
    SELECT o.id INTO v_org_id FROM public.organizations o
     WHERE o.owner_id=v_uid AND o.deleted_at IS NULL
     ORDER BY o.created_at,o.id LIMIT 1 FOR UPDATE;
    IF v_org_id IS NULL THEN
      INSERT INTO public.organizations(name,owner_id) VALUES(pg_catalog.btrim(p_name),v_uid)
      RETURNING id INTO v_org_id;
    END IF;
  END IF;
  INSERT INTO public.organization_members(organization_id,user_id,role,status,joined_at)
  VALUES(v_org_id,v_uid,'owner','active',pg_catalog.now())
  ON CONFLICT(organization_id,user_id) DO UPDATE
    SET role='owner',status='active',
        joined_at=COALESCE(public.organization_members.joined_at,pg_catalog.now());
  SELECT s.plan,s.status INTO v_plan,v_status FROM public.subscriptions s
   WHERE s.user_id=v_uid ORDER BY s.updated_at DESC NULLS LAST LIMIT 1;
  IF v_status IS DISTINCT FROM 'active' AND v_status IS DISTINCT FROM 'trialing' THEN v_plan:='free'; END IF;
  SELECT sp.max_companies INTO v_max_companies FROM public.subscription_plans sp
   WHERE sp.key=COALESCE(v_plan,'free') AND sp.is_active;
  IF v_max_companies IS NULL THEN
    SELECT sp.max_companies INTO v_max_companies FROM public.subscription_plans sp
     WHERE sp.key='free' AND sp.is_active;
  END IF;
  IF v_max_companies IS NULL OR v_max_companies<1 THEN
    RAISE EXCEPTION 'Company limit is not configured for this subscription';
  END IF;
  SELECT pg_catalog.count(DISTINCT cm.company_id) INTO v_owned_count
    FROM public.company_members cm
   WHERE cm.user_id=v_uid AND cm.role='owner' AND cm.status='active';
  IF v_owned_count>=v_max_companies THEN
    RAISE EXCEPTION 'company_limit_reached: your plan allows up to % companies',v_max_companies USING errcode='P0001';
  END IF;
  INSERT INTO public.companies(user_id,name,email,address,currency,organization_id,phone,website,city,state,postal_code,country,tax_number)
  VALUES(v_uid,pg_catalog.btrim(p_name),p_email,p_address,COALESCE(p_currency,'USD'),v_org_id,
         p_phone,p_website,p_city,p_state,p_postal_code,p_country,p_tax_number)
  RETURNING * INTO v_new_company;
  INSERT INTO public.company_members(company_id,user_id,role,role_id,status,joined_at)
  VALUES(v_new_company.id,v_uid,'owner',v_owner_role_id,'active',pg_catalog.now());
  INSERT INTO public.company_settings(company_id,timezone) VALUES(v_new_company.id,'UTC');
  INSERT INTO public.company_tax_settings(company_id,name,rate,is_default)
  VALUES(v_new_company.id,'No Tax',0,true);
  INSERT INTO public.accounts(user_id,company_id,code,name,type,is_system,is_active) VALUES
    (v_uid,v_new_company.id,'1000','Cash','asset',true,true),
    (v_uid,v_new_company.id,'1010','Bank account','asset',true,true),
    (v_uid,v_new_company.id,'1100','Accounts receivable','asset',true,true),
    (v_uid,v_new_company.id,'1200','Inventory','asset',true,true),
    (v_uid,v_new_company.id,'1500','Fixed assets','asset',true,true),
    (v_uid,v_new_company.id,'2000','Accounts payable','liability',true,true),
    (v_uid,v_new_company.id,'2100','Sales tax payable','liability',true,true),
    (v_uid,v_new_company.id,'2200','Credit card','liability',true,true),
    (v_uid,v_new_company.id,'2500','Loans payable','liability',true,true),
    (v_uid,v_new_company.id,'3000','Owner equity','equity',true,true),
    (v_uid,v_new_company.id,'3100','Retained earnings','equity',true,true),
    (v_uid,v_new_company.id,'3200','Owner draws','equity',true,true),
    (v_uid,v_new_company.id,'4000','Sales revenue','revenue',true,true),
    (v_uid,v_new_company.id,'4100','Service revenue','revenue',true,true),
    (v_uid,v_new_company.id,'4900','Other income','revenue',true,true),
    (v_uid,v_new_company.id,'4910','FX gain','revenue',true,true),
    (v_uid,v_new_company.id,'5000','Cost of goods sold','expense',true,true),
    (v_uid,v_new_company.id,'6000','Rent','expense',true,true),
    (v_uid,v_new_company.id,'6100','Utilities','expense',true,true),
    (v_uid,v_new_company.id,'6200','Salaries and wages','expense',true,true),
    (v_uid,v_new_company.id,'6300','Office supplies','expense',true,true),
    (v_uid,v_new_company.id,'6400','Software and subscriptions','expense',true,true),
    (v_uid,v_new_company.id,'6500','Marketing and advertising','expense',true,true),
    (v_uid,v_new_company.id,'6600','Travel','expense',true,true),
    (v_uid,v_new_company.id,'6700','Meals and entertainment','expense',true,true),
    (v_uid,v_new_company.id,'6800','Professional fees','expense',true,true),
    (v_uid,v_new_company.id,'6900','Bank fees','expense',true,true),
    (v_uid,v_new_company.id,'6910','FX loss','expense',true,true),
    (v_uid,v_new_company.id,'7000','Depreciation','expense',true,true),
    (v_uid,v_new_company.id,'7900','Other expenses','expense',true,true);
  INSERT INTO public.audit_logs(company_id,user_id,action,entity_type,entity_id,metadata)
  VALUES(v_new_company.id,v_uid,'company.created','company',v_new_company.id,
         pg_catalog.jsonb_build_object('name',v_new_company.name));
  RETURN v_new_company;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_company(text,text,text,text,uuid,text,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_company(text,text,text,text,uuid,text,text,text,text,text,text,text) TO authenticated;
