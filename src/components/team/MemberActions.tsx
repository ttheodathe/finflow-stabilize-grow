import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, RefreshCw, XCircle } from 'lucide-react';
import type { CompanyMember, TeamInvitation } from '@/types/team.types';

interface MemberActionsProps {
  companyId: string;
  member?: CompanyMember;
  invitation?: TeamInvitation;
  onChangeRole?: () => void;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onRemove?: () => void;
  onResendInvitation?: () => void;
  onRevokeInvitation?: () => void;
}

export function MemberActions({
  member,
  invitation,
  onChangeRole,
  onSuspend,
  onReactivate,
  onRemove,
  onResendInvitation,
  onRevokeInvitation,
}: MemberActionsProps) {
  if (invitation) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onResendInvitation}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Resend invitation
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRevokeInvitation} className="text-destructive focus:text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            Revoke invitation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!member) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onChangeRole}>Change role</DropdownMenuItem>
        <DropdownMenuSeparator />
        {member.status === 'suspended' ? (
          <DropdownMenuItem onClick={onReactivate}>Reactivate</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onSuspend}>Suspend</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
          Remove from company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
