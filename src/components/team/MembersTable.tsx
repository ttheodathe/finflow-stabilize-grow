import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RoleSelector } from './RoleSelector';
import { MemberActions } from './MemberActions';
import { TeamEmptyState } from './TeamEmptyState';
import type { CompanyMember, Role, TeamInvitation } from '@/types/team.types';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDistanceToNow } from 'date-fns';

interface MembersTableProps {
  companyId: string;
  members: CompanyMember[];
  invitations: TeamInvitation[];
  roles: Role[];
  onInviteClick: () => void;
  onChangeRole: (memberId: string, newRoleId: string) => Promise<unknown>;
  onSuspend: (memberId: string) => Promise<unknown>;
  onReactivate: (memberId: string) => Promise<unknown>;
  onRemove: (memberId: string) => Promise<unknown>;
  onResendInvitation: (invitationId: string) => Promise<unknown>;
  onRevokeInvitation: (invitationId: string) => Promise<unknown>;
}

function statusBadge(status: CompanyMember['status'] | TeamInvitation['status']) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    active: { label: 'Active', variant: 'default' },
    invited: { label: 'Invited', variant: 'secondary' },
    pending: { label: 'Pending', variant: 'secondary' },
    suspended: { label: 'Suspended', variant: 'destructive' },
    removed: { label: 'Removed', variant: 'outline' },
    expired: { label: 'Expired', variant: 'outline' },
    revoked: { label: 'Revoked', variant: 'outline' },
    accepted: { label: 'Accepted', variant: 'default' },
  };
  const cfg = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function MembersTable({
  companyId,
  members,
  invitations,
  roles,
  onInviteClick,
  onChangeRole,
  onSuspend,
  onReactivate,
  onRemove,
  onResendInvitation,
  onRevokeInvitation,
}: MembersTableProps) {
  const { can } = usePermissions(companyId);
  const [roleDialogMember, setRoleDialogMember] = useState<CompanyMember | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState<string | undefined>();

  const isEmpty = members.length === 0 && invitations.length === 0;
  if (isEmpty) {
    return <TeamEmptyState onInviteClick={onInviteClick} canInvite={can('users.invite')} />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[56px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-[48px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(member.profile?.full_name ?? member.profile?.email ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{member.profile?.full_name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{member.profile?.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{member.role?.name}</Badge>
              </TableCell>
              <TableCell>{statusBadge(member.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {member.last_active_at
                  ? formatDistanceToNow(new Date(member.last_active_at), { addSuffix: true })
                  : '—'}
              </TableCell>
              <TableCell className="text-right">
                <MemberActions
                  companyId={companyId}
                  member={member}
                  onChangeRole={() => {
                    setRoleDialogMember(member);
                    setPendingRoleId(member.role_id);
                  }}
                  onSuspend={() => onSuspend(member.id)}
                  onReactivate={() => onReactivate(member.id)}
                  onRemove={() => onRemove(member.id)}
                />
              </TableCell>
            </TableRow>
          ))}

          {invitations.map((invitation) => (
            <TableRow key={invitation.id} className="bg-muted/30">
              <TableCell>
                <Avatar className="h-8 w-8 opacity-60">
                  <AvatarFallback>{invitation.email.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="text-muted-foreground">Pending invitation</TableCell>
              <TableCell className="text-muted-foreground">{invitation.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{invitation.role?.name}</Badge>
              </TableCell>
              <TableCell>{statusBadge(invitation.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right">
                <MemberActions
                  companyId={companyId}
                  invitation={invitation}
                  onResendInvitation={() => onResendInvitation(invitation.id)}
                  onRevokeInvitation={() => onRevokeInvitation(invitation.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!roleDialogMember} onOpenChange={(open) => !open && setRoleDialogMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Change role for {roleDialogMember?.profile?.full_name ?? roleDialogMember?.profile?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RoleSelector roles={roles} value={pendingRoleId} onChange={setPendingRoleId} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogMember(null)}>
              Cancel
            </Button>
            <Button
              disabled={!pendingRoleId || pendingRoleId === roleDialogMember?.role_id}
              onClick={async () => {
                if (roleDialogMember && pendingRoleId) {
                  await onChangeRole(roleDialogMember.id, pendingRoleId);
                  setRoleDialogMember(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
