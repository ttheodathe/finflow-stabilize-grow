import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import Invitation from "@/emails/Invitation";

// Lazy: process.env is only populated per-request in the worker runtime.
let _resend: Resend | undefined;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// SECURITY: this route sends email from our domain, so it must never trust the browser
// for the recipient, link or names. The caller sends only { invitationId } with their
// session token. Everything else is read from the database, and the caller must be allowed
// to invite for that company.
export const Route = createFileRoute("/api/send-invitation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { authenticate, hasCompanyPermission, SITE_URL } =
            await import("@/lib/api-auth.server");
          const caller = await authenticate(request);
          if (caller instanceof Response) return caller;

          const body = await request.json().catch(() => ({}));
          const invitationId = typeof body?.invitationId === "string" ? body.invitationId : "";
          if (!invitationId) {
            return Response.json({ error: "invitationId is required" }, { status: 400 });
          }

          const { data: invitation } = await caller.admin
            .from("team_invitations")
            .select("id, company_id, email, token, status, expires_at, invited_by")
            .eq("id", invitationId)
            .maybeSingle();
          if (!invitation) {
            return Response.json({ error: "Invitation not found" }, { status: 404 });
          }

          const allowed =
            invitation.invited_by === caller.userId ||
            (await hasCompanyPermission(
              caller.admin,
              caller.userId,
              invitation.company_id,
              "users.invite",
            ));
          if (!allowed) {
            return Response.json({ error: "Not allowed to send this invitation" }, { status: 403 });
          }
          if (invitation.status !== "pending" || new Date(invitation.expires_at) < new Date()) {
            return Response.json({ error: "This invitation is no longer active" }, { status: 409 });
          }

          const [{ data: company }, { data: profile }] = await Promise.all([
            caller.admin
              .from("companies")
              .select("name")
              .eq("id", invitation.company_id)
              .maybeSingle(),
            caller.admin
              .from("profiles")
              .select("full_name, email")
              .eq("id", caller.userId)
              .maybeSingle(),
          ]);
          const companyName = company?.name || "your company";
          const inviterName =
            profile?.full_name || profile?.email || caller.email || "A team member";
          const inviteUrl = `${SITE_URL}/invite/${invitation.token}`;

          const { data, error } = await getResend().emails.send({
            from: "FinFlowTrack <support@finflowtrack.com>",
            to: [invitation.email],
            subject: `You've been invited to join ${companyName} on FinFlowTrack`,
            react: (
              <Invitation
                inviterName={inviterName}
                companyName={companyName}
                inviteUrl={inviteUrl}
              />
            ),
          });

          if (error) {
            console.error(error);
            return Response.json({ error: "Failed sending invitation email" }, { status: 500 });
          }
          return Response.json({ success: true, id: data?.id });
        } catch (error) {
          console.error(error);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
