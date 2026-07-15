import { supabase } from '@/integrations/supabase/client';
import type { CompanyMember, TeamInvitation } from '@/types/team.types';
import { TeamServiceError } from '@/types/team.types';
import { mapRpcError } from './team.service';

const INVITATION_SELECT = `
  id, company_id, email, role_id, token, personal_message, status, expires_at, invited_by, accepted_at, created_at,
  role:roles ( id, key, name ),
  invited_by_profile:profiles!team_invitations_invited_by_fkey ( id, email, full_name, avatar_url )
`;

export async function listPendingInvitations(companyId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(INVITATION_SELECT)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new TeamServiceError('FETCH_INVITATIONS_FAILED', error.message);
  return (data ?? []) as unknown as TeamInvitation[];
}

export interface CreateInvitationInput {
  companyId: string;
  email: string;
  roleId: string;
  personalMessage?: string;
}

/**
 * Creates an invitation (seat-limit checked server-side) and triggers the
 * invitation email via a Supabase Edge Function. The DB write and the email
 * send are deliberately separate: if the email send fails, the invitation
 * still exists and can be resent from the UI.
 */
export async function createInvitation(input: CreateInvitationInput): Promise<TeamInvitation> {
  const { data, error } = await supabase.rpc('create_team_invitation', {
    p_company_id: input.companyId,
    p_email: input.email.trim().toLowerCase(),
    p_role_id: input.roleId,
    p_personal_message: input.personalMessage ?? null,
  });

  if (error) throw mapRpcError(error);
  const invitation = data as TeamInvitation;

  try {
    await sendInvitationEmail(invitation.id);
  } catch (emailError) {
    // Non-fatal: invitation exists, surface a soft warning to the caller.
    console.error('Invitation created but email failed to send', emailError);
  }

  return invitation;
}

async function sendInvitationEmail(invitationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-team-invitation-email', {
    body: { invitationId },
  });
  if (error) throw error;
}

export async function resendInvitation(invitationId: string): Promise<TeamInvitation> {
  const { data, error } = await supabase.rpc('resend_team_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw mapRpcError(error);
  const invitation = data as TeamInvitation;
  await sendInvitationEmail(invitation.id).catch((e) => console.error('Resend email failed', e));
  return invitation;
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);
  if (error) throw new TeamServiceError('REVOKE_FAILED', error.message);
}

/** Public lookup used by the /invite/:token page — does not require membership. */
export async function getInvitationByToken(token: string): Promise<TeamInvitation | null> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(`${INVITATION_SELECT}, company:companies ( id, name )`)
    .eq('token', token)
    .maybeSingle();

  if (error) throw new TeamServiceError('FETCH_INVITATION_FAILED', error.message);
  return (data as unknown as TeamInvitation) ?? null;
}

/** Accept an invitation for the currently authenticated user. */
export async function acceptInvitation(token: string): Promise<CompanyMember> {
  const { data, error } = await supabase.rpc('accept_team_invitation', { p_token: token });
  if (error) throw mapRpcError(error);
  return data as CompanyMember;
}
