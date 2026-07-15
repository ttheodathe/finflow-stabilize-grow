
alter table public.accounts drop constraint accounts_user_id_code_key;
alter table public.accounts add constraint accounts_company_id_code_key unique (company_id, code);
