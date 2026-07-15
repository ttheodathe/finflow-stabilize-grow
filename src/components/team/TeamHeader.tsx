import { Button } from '@/components/ui/button';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface TeamHeaderProps {
  companyId: string;
  seatUsage?: { used: number; limit: number | null };
  onInviteClick: () => void;
  onManageRolesClick: () => void;
}

export function TeamHeader({ companyId, seatUsage, onInviteClick, onManageRolesClick }: TeamHeaderProps) {
  const { can } = usePermissions(companyId);

  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to this company
          {seatUsage && (
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              · {seatUsage.used} / {seatUsage.limit ?? '∞'} seats used
            </span>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        {can('users.change_role') && (
          <Button variant="outline" onClick={onManageRolesClick}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Manage Roles
          </Button>
        )}
        {can('users.invite') && (
          <Button onClick={onInviteClick}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>
    </div>
  );
}
