import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/partners/track-click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          code?: string;
          visitorId?: string;
          landingPath?: string;
          referrer?: string | null;
          utmSource?: string | null;
          utmMedium?: string | null;
          utmCampaign?: string | null;
        };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const { code, visitorId } = body;
        if (!code || !visitorId) {
          return new Response("Missing code or visitorId", { status: 400 });
        }

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: partner tables not yet in generated types export path used elsewhere in this file
        const supabaseAdmin = _admin as any;

        // Look up the partner by code first rather than trusting it blindly —
        // this also means an invalid/typo'd ?ref= code silently records
        // nothing instead of creating an orphaned click row, and we never
        // reveal to the caller whether a code exists (always 204).
        const { data: partner } = await supabaseAdmin
          .from("partners")
          .select("id, status")
          .eq("referral_code", code)
          .maybeSingle();

        if (partner && partner.status === "active") {
          await supabaseAdmin.from("partner_referral_clicks").insert({
            partner_id: partner.id,
            visitor_id: visitorId,
            landing_path: body.landingPath ?? null,
            referrer: body.referrer ?? null,
            utm_source: body.utmSource ?? null,
            utm_medium: body.utmMedium ?? null,
            utm_campaign: body.utmCampaign ?? null,
          });
        }

        return new Response(null, { status: 204 });
      },
    },
  },
});
