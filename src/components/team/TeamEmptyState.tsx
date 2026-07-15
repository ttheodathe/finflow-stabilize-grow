import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

interface TeamEmptyStateProps {
  onInviteClick: () => void;
  canInvite: boolean;
}

export function TeamEmptyState({ onInviteClick, canInvite }: TeamEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-medium">No team members yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite people to collaborate on this company's books.
        </p>
      </div>
      {canInvite && (
        <Button size="sm" onClick={onInviteClick}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite a member
        </Button>
      )}
    </div>
  );
}
