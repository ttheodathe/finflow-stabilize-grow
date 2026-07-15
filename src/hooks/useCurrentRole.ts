import { useQuery } from '@tanstack/react-query';
import { getCurrentMembership } from '@/services/team/team.service';

/** The current user's own membership + role within a given company. */
export function useCurrentRole(companyId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['current-membership', companyId],
    queryFn: () => getCurrentMembership(companyId),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });

  return {
    membership: data ?? null,
    role: data?.role ?? null,
    roleKey: data?.role?.key ?? null,
    isOwner: data?.role?.key === 'owner',
    isAdmin: data?.role?.key === 'admin' || data?.role?.key === 'owner',
    isLoading,
    error,
  };
}
