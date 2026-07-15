import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { listAllPermissions } from '@/services/team/permission.service';
import { listRolesForCompany } from '@/services/team/role.service';
import { updateRolePermissions } from '@/services/team/role.service';
import type { Permission, Role } from '@/types/team.types';
import { supabase } from '@/integrations/supabase/client';

interface PermissionMatrixProps {
  companyId: string;
  /** Only Owner/Admin should be able to reach this component at the route level. */
  readOnly?: boolean;
}

export function PermissionMatrix({ companyId, readOnly = false }: PermissionMatrixProps) {
  const queryClient = useQueryClient();

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['permissions-catalog'],
    queryFn: listAllPermissions,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', companyId],
    queryFn: () => listRolesForCompany(companyId),
    enabled: Boolean(companyId),
  });

  // roleId -> Set(permissionId)
  const { data: matrix = {} } = useQuery<Record<string, Set<string>>>({
    queryKey: ['role-permission-matrix', companyId, roles.map((r) => r.id).join(',')],
    queryFn: async () => {
      if (roles.length === 0) return {};
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_id, permission_id')
        .in('role_id', roles.map((r) => r.id));
      if (error) throw error;
      const map: Record<string, Set<string>> = {};
      for (const row of data ?? []) {
        if (!map[row.role_id]) map[row.role_id] = new Set();
        map[row.role_id].add(row.permission_id);
      }
      return map;
    },
    enabled: roles.length > 0,
  });

  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ role, permissionId, checked }: { role: Role; permissionId: string; checked: boolean }) => {
      const current = new Set(matrix[role.id] ?? []);
      if (checked) current.add(permissionId);
      else current.delete(permissionId);
      await updateRolePermissions(role.id, Array.from(current));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix', companyId] });
    },
  });

  const grouped = useMemo(() => {
    const byCategory: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    }
    return byCategory;
  }, [permissions]);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Permission</TableHead>
            {roles.map((role) => (
              <TableHead key={role.id} className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span>{role.name}</span>
                  {role.is_system && (
                    <Badge variant="outline" className="text-[10px]">
                      System
                    </Badge>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(grouped).map(([category, perms]) => (
            <React.Fragment key={category}>
              <TableRow className="bg-muted/40">
                <TableCell colSpan={roles.length + 1} className="text-xs font-semibold uppercase text-muted-foreground">
                  {category}
                </TableCell>
              </TableRow>
              {perms.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{permission.label}</div>
                    {permission.description && (
                      <div className="text-xs text-muted-foreground">{permission.description}</div>
                    )}
                  </TableCell>
                  {roles.map((role) => {
                    const key = `${role.id}:${permission.id}`;
                    const checked = matrix[role.id]?.has(permission.id) ?? false;
                    // Owner always has everything and it's not editable.
                    const disabled = readOnly || role.key === 'owner' || (toggleMutation.isPending && pendingKey === key);
                    return (
                      <TableCell key={role.id} className="text-center">
                        <Checkbox
                          checked={role.key === 'owner' ? true : checked}
                          disabled={disabled}
                          onCheckedChange={(value) => {
                            setPendingKey(key);
                            toggleMutation.mutate({ role, permissionId: permission.id, checked: Boolean(value) });
                          }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
