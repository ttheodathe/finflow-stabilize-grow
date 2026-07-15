import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Role } from '@/types/team.types';

interface RoleSelectorProps {
  roles: Role[];
  value: string | undefined;
  onChange: (roleId: string) => void;
  disabled?: boolean;
  /** Hide roles that should never be manually assignable (e.g. Owner). */
  excludeKeys?: string[];
}

export function RoleSelector({ roles, value, onChange, disabled, excludeKeys = ['owner'] }: RoleSelectorProps) {
  const selectable = roles.filter((r) => !excludeKeys.includes(r.key));

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {selectable.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            <div className="flex flex-col">
              <span>{role.name}</span>
              {role.description && (
                <span className="text-xs text-muted-foreground">{role.description}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
