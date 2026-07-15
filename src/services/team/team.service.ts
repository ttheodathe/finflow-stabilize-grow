import { supabase } from '@/integrations/supabase/client';
import type { CompanyMember, MemberStatus, TeamServiceError as TeamServiceErrorType } from '@/types/team.types';
import { TeamServiceError } from '@/types/team.types';

const MEMBER_SELECT = `
  id, company_id, user_id, role_id, status, joined_at, invited_by, created_at, updated_at,
  profile:profiles!company_members_user_id_fkey ( id, email, full_name, avatar_url ),
  role:roles ( id, key, name, description, is_system, is_removable )
`;

/** List all members of a company (all statuses except 'removed' by default). */
export async function listCompanyMembers(
  companyId: string,
  opts: { includeRemoved?: boolean } = {}
): Promise<CompanyMember[]> {
  let query = supabase
    .from('company_members')
    .select(MEMBER_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (!opts.includeRemoved) {
    query = query.neq('status', 'removed');
  }

  const { data, error } = await query;
  if (error) throw new TeamServiceError('FETCH_MEMBERS_FAILED', error.message);
  return (data ?? []) as unknown as CompanyMember[];
}

/** Fetch the current user's membership row (with role) for a given company. */
export async function getCurrentMembership(companyId: string): Promise<CompanyMember | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('company_members')
    .select(MEMBER_SELECT)
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new TeamServiceError('FETCH_MEMBERSHIP_FAILED', error.message);
  return (data as unknown as CompanyMember) ?? null;
}

/** Change a member's role. Enforced server-side via RPC (owner immutable etc). */
export async function changeMemberRole(memberId: string, newRoleId: string): Promise<CompanyMember> {
  const { data, error } = await supabase.rpc('change_member_role', {
    p_member_id: memberId,
    p_new_role_id: newRoleId,
  });
  if (error) throw mapRpcError(error);
  return data as CompanyMember;
}

/** Suspend, reactivate, or remove a member. */
export async function setMemberStatus(memberId: string, status: MemberStatus): Promise<CompanyMember> {
  const { data, error } = await supabase.rpc('set_member_status', {
    p_member_id: memberId,
    p_status: status,
  });
  if (error) throw mapRpcError(error);
  return data as CompanyMember;
}

export const removeMember = (memberId: string) => setMemberStatus(memberId, 'removed');
export const suspendMember = (memberId: string) => setMemberStatus(memberId, 'suspended');
export const reactivateMember = (memberId: string) => setMemberStatus(memberId, 'active');

/**
 * Maps a Postgres error (raised via `raise exception '...' using errcode = ...`)
 * to a TeamServiceError with a stable code and a user-facing message.
 * Postgres RAISE messages look like: "SEAT_LIMIT_REACHED: Your plan limit ..."
 */
function mapRpcError(error: { message: string; code?: string }): TeamServiceErrorType {
  const match = /^([A-Z_]+):\s*(.*)$/s.exec(error.message ?? '');
  if (match) {
    return new TeamServiceError(match[1], match[2]);
  }
  return new TeamServiceError('UNKNOWN_ERROR', error.message ?? 'Something went wrong.');
}

export { mapRpcError };
