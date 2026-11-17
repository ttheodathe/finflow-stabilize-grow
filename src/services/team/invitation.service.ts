import { supabase as _sb } from "@/integrations/supabase/client";
const supabase = _sb as any;
import type { CompanyMember, TeamInvitation, PublicTeamInvitation } from "@/types/team.types";
import { TeamServiceError } from "@/types/team.types";
import { mapRpcError } from "./team.service";

const INVITATION_SELECT = `
  id, company_id, email, role_id, token, personal_message, status, expires_at, invited_by, accepted_at, created_at,
  role:roles ( id, key, name ),
  invited_by_profile:profiles!team_invitations_invited_by_fkey ( id, email, full_name, avatar_url )
`;

export async function listPendingInvitations(companyId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from("team_invitations")
    .select(INVITATION_SELECT)
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new TeamServiceError("FETCH_INVITATIONS_FAILED", error.message);
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
 * invitation email via our own /api/send-invitation server route. The DB
 * write and the email send are deliberately separate: if the email send
 * fails, the invitation still exists and can be resent from the UI — but
 * `emailSent` is set to false so the caller can warn the user instead of
 * silently pretending it worked.
 */
export async function createInvitation(input: CreateInvitationInput): Promise<TeamInvitation> {
  const { data, error } = await supabase.rpc("create_team_invitation", {
    p_company_id: input.companyId,
    p_email: input.email.trim().toLowerCase(),
    p_role_id: input.roleId,
    p_personal_message: input.personalMessage ?? null,
  });

  if (error) throw mapRpcError(error);
  const invitation = data as TeamInvitation;

  invitation.emailSent = await sendInvitationEmail(invitation);

  return invitation;
}

/**
 * Sends the invitation through our server route. The server resolves the
 * recipient and token using its service-role client and checks authorization.
 */
async function sendInvitationEmail(invitation: TeamInvitation): Promise<boolean> {
  try {
    const { data: sessionRes } = await supabase.auth.getSession();
    const accessToken = sessionRes?.session?.access_token;
    if (!accessToken) throw new Error("Not signed in");
    const response = await fetch("/api/send-invitation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ invitationId: invitation.id }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error ?? `Send failed with status ${response.status}`);
    }
    return true;
  } catch (emailError) {
    console.error("Invitation created but email failed to send", emailError);
    return false;
  }
}

export async function resendInvitation(invitationId: string): Promise<TeamInvitation> {
  const { data, error } = await supabase.rpc("resend_team_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) throw mapRpcError(error);
  const invitation = data as TeamInvitation;
  invitation.emailSent = await sendInvitationEmail(invitation);
  return invitation;
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from("team_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  if (error) throw new TeamServiceError("REVOKE_FAILED", error.message);
}

/**
 * Public invitation landing-page lookup. The RPC returns only the invited
 * email and display metadata; it never exposes the bearer token or full row.
 */
export async function getInvitationByToken(token: string): Promise<PublicTeamInvitation | null> {
  // The database parameter is UUID-typed; reject malformed URLs before calling PostgREST.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_public_team_invitation", {
    p_token: token,
  });

  if (error) throw new TeamServiceError("FETCH_INVITATION_FAILED", error.message);
  return (data as PublicTeamInvitation | null) ?? null;
}

/** Accept an invitation for the currently authenticated user. */
export async function acceptInvitation(token: string): Promise<CompanyMember> {
  const { data, error } = await supabase.rpc("accept_team_invitation", { p_token: token });
  if (error) throw mapRpcError(error);
  return data as unknown as CompanyMember;
}
