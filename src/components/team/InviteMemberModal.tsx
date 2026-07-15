import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { RoleSelector } from './RoleSelector';
import type { Role } from '@/types/team.types';
import { useInviteMember } from '@/hooks/useInviteMember';

interface InviteMemberModalProps {
  companyId: string;
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberModal({ companyId, roles, open, onOpenChange }: InviteMemberModalProps) {
  const { inviteMember, isInviting, error, seatUsage, seatLimitReached, isLoadingSeatUsage } =
    useInviteMember(companyId);

  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  function reset() {
    setEmail('');
    setRoleId(undefined);
    setMessage('');
    setEmailError(null);
  }

  async function handleSubmit() {
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (!roleId) return;

    await inviteMember({ email, roleId, personalMessage: message || undefined });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            They'll receive an email with a link to join this company.
          </DialogDescription>
        </DialogHeader>

        {!isLoadingSeatUsage && seatLimitReached && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Plan limit reached</AlertTitle>
            <AlertDescription>
              Your plan limit has been reached. Upgrade to add more team members.
            </AlertDescription>
          </Alert>
        )}

        {error && error.code !== 'SEAT_LIMIT_REACHED' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              disabled={seatLimitReached}
            />
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Role</Label>
            <RoleSelector roles={roles} value={roleId} onChange={setRoleId} disabled={seatLimitReached} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invite-message">Personal Message (optional)</Label>
            <Textarea
              id="invite-message"
              placeholder="Welcome to the team!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={seatLimitReached}
              rows={3}
            />
          </div>

          {seatUsage && (
            <p className="text-xs text-muted-foreground">
              {seatUsage.used} of {seatUsage.limit ?? 'unlimited'} seats used
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isInviting || !email || !roleId || seatLimitReached}>
            {isInviting ? 'Sending…' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
