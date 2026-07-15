import { useQuery } from '@tanstack/react-query';
import { getCurrentUserPermissionKeys } from '@/services/team/permission.service';
import type { PermissionKey } from '@/types/team.types';

/**
 * usePermissions(companyId) → { can, isLoading, permissionKeys }
 *
 * Usage:
 *   const { can } = usePermissions(companyId);
 *   {can('users.invite') && <InviteButton />}
 *
 * Note: this is a UX convenience only — every mutating action is
 * re-checked server-side (RLS + RPC functions), so hiding a button here
 * never substitutes for the real authorization check.
 */
export function usePermissions(companyId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['current-user-permissions', companyId],
    queryFn: () => getCurrentUserPermissionKeys(companyId),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });

  const permissionKeys = data ?? new Set<string>();

  function can(permission: PermissionKey): boolean {
    return permissionKeys.has(permission);
  }

  function canAny(permissions: PermissionKey[]): boolean {
    return permissions.some((p) => permissionKeys.has(p));
  }

  function canAll(permissions: PermissionKey[]): boolean {
    return permissions.every((p) => permissionKeys.has(p));
  }

  return { can, canAny, canAll, permissionKeys, isLoading, error };
}

/** Convenience alias matching the spec's `usePermission("invoice.delete")` single-check form. */
export function usePermission(companyId: string, permission: PermissionKey): boolean {
  const { can } = usePermissions(companyId);
  return can(permission);
}
