import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import Invitation from "@/emails/Invitation";

const resend = new Resend(process.env.RESEND_API_KEY);

export const Route = createFileRoute("/api/send-invitation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          const { email, inviterName, companyName, inviteUrl } = body;

          if (!email) {
            return Response.json(
              { error: "Recipient email is required" },
              { status: 400 }
            );
          }

          if (!inviteUrl) {
            return Response.json(
              { error: "Invite URL is required" },
              { status: 400 }
            );
          }

          const { data, error } = await resend.emails.send({
            from: "FinFlowTrack <invites@finflowtrack.com>",
            to: [email],
            subject: `You've been invited to join ${companyName || "a team"} on FinFlowTrack`,
            react: (
              <Invitation
                inviterName={inviterName || "A team member"}
                companyName={companyName || "your company"}
                inviteUrl={inviteUrl}
              />
            ),
          });

          if (error) {
            console.error(error);
            return Response.json(
              { error: "Failed sending invitation email" },
              { status: 500 }
            );
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
