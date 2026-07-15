import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvitation } from '@/services/team/invitation.service';
import { getSeatUsage } from '@/services/team/permission.service';
import { useQuery } from '@tanstack/react-query';
import { teamMembersQueryKey, teamInvitationsQueryKey } from './useTeamMembers';
import type { TeamServiceError } from '@/types/team.types';

export function useSeatUsage(companyId: string) {
  return useQuery({
    queryKey: ['seat-usage', companyId],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(companyId) });
      queryClient.invalidateQueries({ queryKey: teamInvitationsQueryKey(companyId) });
      queryClient.invalidateQueries({ queryKey: ['seat-usage', companyId] });
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
