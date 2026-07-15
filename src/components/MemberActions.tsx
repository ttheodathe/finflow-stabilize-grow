import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ShieldPlus, Ban, Trash2, RotateCcw, Send } from 'lucide-react';
import type { CompanyMember, TeamInvitation } from '@/types/team.types';
import { usePermissions } from '@/hooks/usePermissions';

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
  companyId,
  member,
  invitation,
  onChangeRole,
  onSuspend,
  onReactivate,
  onRemove,
  onResendInvitation,
  onRevokeInvitation,
}: MemberActionsProps) {
  const { can } = usePermissions(companyId);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const isOwner = member?.role?.key === 'owner';

  if (invitation) {
    if (!can('users.invite')) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onResendInvitation}>
            <Send className="mr-2 h-4 w-4" /> Resend Invitation
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onRevokeInvitation} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Revoke Invitation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!member || isOwner) return null; // Owner row has no actions menu

  const canChangeRole = can('users.change_role');
  const canRemove = can('users.remove');
  if (!canChangeRole && !canRemove) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canChangeRole && (
            <DropdownMenuItem onSelect={onChangeRole}>
              <ShieldPlus className="mr-2 h-4 w-4" /> Change Role
            </DropdownMenuItem>
          )}
          {canChangeRole && member.status === 'active' && (
            <DropdownMenuItem onSelect={onSuspend}>
              <Ban className="mr-2 h-4 w-4" /> Suspend
            </DropdownMenuItem>
          )}
          {canChangeRole && member.status === 'suspended' && (
            <DropdownMenuItem onSelect={onReactivate}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reactivate
            </DropdownMenuItem>
          )}
          {canRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setConfirmRemoveOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.profile?.full_name ?? member.profile?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to this company. This can't be undone from here — they
              would need to be re-invited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onRemove?.();
                setConfirmRemoveOpen(false);
              }}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
