import { createFileRoute } from "@tanstack/react-router";

// Deliberately permissive but sane — this only gates obviously malformed input;
// real verification (bounces, confirmation) happens at the email-sending layer.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute("/api/public/newsletter/subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: string; source?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const email = body.email?.trim().toLowerCase();
        if (!email || !EMAIL_REGEX.test(email) || email.length > 320) {
          return Response.json({ error: "Enter a valid email address." }, { status: 400 });
        }

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: newsletter_subscribers not yet in generated types export path used elsewhere in this file
        const supabaseAdmin = _admin as any;

        const { error } = await supabaseAdmin.from("newsletter_subscribers").upsert(
          {
            email,
            source: body.source ?? "footer",
            status: "subscribed",
            unsubscribed_at: null,
          },
          { onConflict: "email" },
        );

        if (error) {
          console.error("[newsletter] insert failed", error);
          return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
        }

        return Response.json({ ok: true }, { status: 200 });
      },
    },
  },
});
