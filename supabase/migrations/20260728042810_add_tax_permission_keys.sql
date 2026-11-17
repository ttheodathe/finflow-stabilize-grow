-- Phase A: Tax module permission keys
insert into public.permissions (key, category, label, description) values
  ('tax.view', 'Tax', 'View tax center', 'View tax settings, returns, and filing history'),
  ('tax.manage_settings', 'Tax', 'Manage tax settings', 'Edit tax rates, jurisdiction, and filing frequency'),
  ('tax.file', 'Tax', 'File tax returns', 'Submit or export tax returns for filing'),
  ('tax.manage_payments', 'Tax', 'Manage tax payments', 'Record and edit payments against tax liabilities')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and p.key in ('tax.view', 'tax.manage_settings', 'tax.file', 'tax.manage_payments')
  and r.key in ('owner', 'admin', 'accountant')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and p.key = 'tax.view'
  and r.key in ('manager')
on conflict do nothing;
