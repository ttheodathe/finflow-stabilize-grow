import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCompanyMembers,
  changeMemberRole,
  suspendMember,
  reactivateMember,
  removeMember,
} from '@/services/team/team.service';
import { listPendingInvitations, resendInvitation, revokeInvitation } from '@/services/team/invitation.service';
import type { CompanyMember, TeamInvitation } from '@/types/team.types';

export function teamMembersQueryKey(companyId: string) {
  return ['team-members', companyId] as const;
}
export function teamInvitationsQueryKey(companyId: string) {
  return ['team-invitations', companyId] as const;
}

export function useTeamMembers(companyId: string) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery<CompanyMember[]>({
    queryKey: teamMembersQueryKey(companyId),
    queryFn: () => listCompanyMembers(companyId),
    enabled: Boolean(companyId),
  });

  const invitationsQuery = useQuery<TeamInvitation[]>({
    queryKey: teamInvitationsQueryKey(companyId),
    queryFn: () => listPendingInvitations(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(companyId) });
    queryClient.invalidateQueries({ queryKey: teamInvitationsQueryKey(companyId) });
  };

  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, newRoleId }: { memberId: string; newRoleId: string }) =>
      changeMemberRole(memberId, newRoleId),
    onSuccess: invalidate,
  });

  const suspendMutation = useMutation({
    mutationFn: (memberId: string) => suspendMember(memberId),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: (memberId: string) => reactivateMember(memberId),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: invalidate,
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSuccess: invalidate,
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: invalidate,
  });

  return {
    members: membersQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    isLoading: membersQuery.isLoading || invitationsQuery.isLoading,
    isError: membersQuery.isError || invitationsQuery.isError,
    error: membersQuery.error ?? invitationsQuery.error,
    refetch: () => Promise.all([membersQuery.refetch(), invitationsQuery.refetch()]),
    changeRole: changeRoleMutation.mutateAsync,
    isChangingRole: changeRoleMutation.isPending,
    suspend: suspendMutation.mutateAsync,
    isSuspending: suspendMutation.isPending,
    reactivate: reactivateMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    resendInvitation: resendInvitationMutation.mutateAsync,
    isResending: resendInvitationMutation.isPending,
    revokeInvitation: revokeInvitationMutation.mutateAsync,
  };
}
