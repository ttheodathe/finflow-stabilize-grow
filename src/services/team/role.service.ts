import { supabase as _sb } from '@/integrations/supabase/client';
const supabase = _sb as any;
import type { Role } from '@/types/team.types';
import { TeamServiceError } from '@/types/team.types';

/** System roles (company_id null) + any custom roles this company has defined. */
export async function listRolesForCompany(companyId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new TeamServiceError('FETCH_ROLES_FAILED', error.message);
  return (data ?? []) as Role[];
}

export interface CreateCustomRoleInput {
  companyId: string;
  key: string;
  name: string;
  description?: string;
  permissionIds: string[];
}

export async function createCustomRole(input: CreateCustomRoleInput): Promise<Role> {
  const { data: role, error } = await supabase
    .from('roles')
    .insert({
      company_id: input.companyId,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      is_system: false,
      is_removable: true,
    })
    .select('*')
    .single();

  if (error) throw new TeamServiceError('CREATE_ROLE_FAILED', error.message);

  if (input.permissionIds.length > 0) {
    const rows = input.permissionIds.map((permission_id) => ({ role_id: role.id, permission_id }));
    const { error: rpError } = await supabase.from('role_permissions').insert(rows);
    if (rpError) throw new TeamServiceError('ASSIGN_PERMISSIONS_FAILED', rpError.message);
  }

  return role as Role;
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
  if (delError) throw new TeamServiceError('UPDATE_PERMISSIONS_FAILED', delError.message);

  if (permissionIds.length > 0) {
    const rows = permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }));
    const { error: insError } = await supabase.from('role_permissions').insert(rows);
    if (insError) throw new TeamServiceError('UPDATE_PERMISSIONS_FAILED', insError.message);
  }
}

export async function deleteCustomRole(roleId: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', roleId);
  if (error) throw new TeamServiceError('DELETE_ROLE_FAILED', error.message);
}
