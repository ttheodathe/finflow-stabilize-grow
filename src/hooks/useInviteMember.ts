import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createInvitation } from "@/services/team/invitation.service";
import { getSeatUsage } from "@/services/team/permission.service";
import { useQuery } from "@tanstack/react-query";
import { teamMembersQueryKey, teamInvitationsQueryKey } from "./useTeamMembers";
import type { TeamServiceError } from "@/types/team.types";

export function useSeatUsage(companyId: string) {
  return useQuery({
    queryKey: ["seat-usage", companyId],
    queryFn: () => getSeatUsage(companyId),
    enabled: Boolean(companyId),
  });
}

export function useInviteMember(companyId: string) {
  const queryClient = useQueryClient();
  const seatUsage = useSeatUsage(companyId);

  const mutation = useMutation({
    mutationFn: (input: { email: string; roleId: string; personalMessage?: string }) =>
      createInvitation({ companyId, ...input }),
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(companyId) });
      queryClient.invalidateQueries({ queryKey: teamInvitationsQueryKey(companyId) });
      queryClient.invalidateQueries({ queryKey: ["seat-usage", companyId] });

      if (invitation.emailSent) {
        toast.success(`Invitation sent to ${invitation.email}`);
      } else {
        toast.warning(
          `Invitation created for ${invitation.email}, but the email failed to send. Use "Resend" from the pending list to try again.`
        );
      }
    },
  });

  const seatLimitReached =
    seatUsage.data?.limit != null && seatUsage.data.used >= seatUsage.data.limit;

  return {
    inviteMember: mutation.mutateAsync,
    isInviting: mutation.isPending,
    error: mutation.error as TeamServiceError | null,
    seatUsage: seatUsage.data,
    seatLimitReached,
    isLoadingSeatUsage: seatUsage.isLoading,
  };
}
