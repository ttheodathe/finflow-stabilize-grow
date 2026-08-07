import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/partners/notify-application")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Missing bearer token", { status: 401 });

        let body: { applicationId?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body.applicationId) return new Response("Missing applicationId", { status: 400 });

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: service-role client typed loosely, matches pattern in track-click.ts
        const admin = _admin as any;

        // Verify the caller is real and is platform staff — this endpoint
        // sends email on the caller's behalf, so it must not trust the
        // applicationId alone.
        const { data: callerData, error: callerError } = await admin.auth.getUser(token);
        if (callerError || !callerData?.user)
          return new Response("Invalid session", { status: 401 });

        const { data: callerProfile } = await admin
          .from("profiles")
          .select("is_staff")
          .eq("id", callerData.user.id)
          .maybeSingle();
        if (!callerProfile?.is_staff) return new Response("Not authorized", { status: 403 });

        const { data: application } = await admin
          .from("partner_applications")
          .select("status, business_name, contact_email, admin_notes")
          .eq("id", body.applicationId)
          .maybeSingle();
        if (!application) return new Response("Application not found", { status: 404 });

        const { sendEmail } = await import("@/lib/email");
        const { subject, html } = buildApplicationEmail(application);
        if (subject) {
          try {
            await sendEmail({ to: application.contact_email, subject, html });
          } catch (err) {
            console.error("[partners] application status email failed:", err);
            // Still 200 — the status change itself already succeeded and
            // shouldn't be reported as failed to the admin over an email hiccup.
          }
        }

        return new Response(null, { status: 204 });
      },
    },
  },
});

function buildApplicationEmail(application: {
  status: string;
  business_name: string;
  admin_notes: string | null;
}): { subject: string | null; html: string } {
  const { status, business_name, admin_notes } = application;

  if (status === "approved") {
    return {
      subject: "You're approved — welcome to the FinFlowTrack Partner Program",
      html: `<p>Hi ${business_name},</p><p>Your partner application has been approved. Sign in to FinFlowTrack and visit <a href="https://finflowtrack.com/partners">your partner dashboard</a> to get your referral link.</p>`,
    };
  }
  if (status === "rejected") {
    return {
      subject: "Update on your FinFlowTrack partner application",
      html: `<p>Hi ${business_name},</p><p>Thanks for applying to the FinFlowTrack Partner Program. After review, we're not able to move forward with your application at this time.${
        admin_notes ? ` ${admin_notes}` : ""
      }</p>`,
    };
  }
  if (status === "needs_more_info") {
    return {
      subject: "A quick question about your FinFlowTrack partner application",
      html: `<p>Hi ${business_name},</p><p>We're reviewing your partner application and need a bit more information before we can proceed.${
        admin_notes ? ` ${admin_notes}` : ""
      } Please reply to this email with details.</p>`,
    };
  }
  return { subject: null, html: "" };
}
