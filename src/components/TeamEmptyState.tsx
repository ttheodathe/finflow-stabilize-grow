import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';

interface TeamEmptyStateProps {
  onInviteClick: () => void;
  canInvite: boolean;
}

export function TeamEmptyState({ onInviteClick, canInvite }: TeamEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">No team members yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Invite your accountant, managers, or employees to start collaborating on this company.
      </p>
      {canInvite && (
        <Button className="mt-6" onClick={onInviteClick}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite your first team member
        </Button>
      )}
    </div>
  );
}
