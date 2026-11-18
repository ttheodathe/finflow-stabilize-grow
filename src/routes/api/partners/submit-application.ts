import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/partners/submit-application")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ipHeader =
          request.headers.get("x-vercel-forwarded-for") ??
          request.headers.get("x-forwarded-for");
        const ip = ipHeader?.split(",")[0]?.trim() ?? "";
        if (!ip || !isIP(ip)) {
          return Response.json({ error: "Unable to verify request origin" }, { status: 400 });
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: service-role client is used only in this server handler.
        const admin = _admin as any;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
          return Response.json({ error: "Application service is not configured" }, { status: 503 });
        }

        // Vercel overwrites x-forwarded-for with the connecting client's public IP.
        // Store only an HMAC, never the raw address.
        const ipHash = createHmac("sha256", serviceKey).update(ip).digest("hex");
        const { data: allowed, error: limitError } = await admin.rpc(
          "consume_partner_application_rate_limit",
          { p_ip_hash: ipHash },
        );
        if (limitError) {
          console.error("[partners] rate-limit check failed:", limitError);
          return Response.json({ error: "Application service temporarily unavailable" }, { status: 503 });
        }
        if (allowed !== true) {
          return Response.json(
            {
              error:
                "Too many applications from this network. Please try again later.",
            },
            { status: 429, headers: { "Retry-After": "3600" } },
          );
        }

        let userId: string | null = null;
        const authorization = request.headers.get("Authorization");
        if (authorization) {
          const match = authorization.match(/^Bearer\s+(.+)$/i);
          if (!match) {
            return Response.json({ error: "Invalid session" }, { status: 401 });
          }
          const { data, error } = await admin.auth.getUser(match[1]);
          if (error || !data?.user) {
            return Response.json({ error: "Invalid session" }, { status: 401 });
          }
          userId = data.user.id;
        }

        const { data, error } = await admin.rpc(
          "submit_partner_application_server",
          {
            p_partner_type: body.partnerType,
            p_business_name: body.businessName,
            p_country: body.country,
            p_contact_email: body.contactEmail,
            p_terms_accepted: body.termsAccepted,
            p_website: body.website ?? null,
            p_industry: body.industry ?? null,
            p_business_type: body.businessType ?? null,
            p_linkedin_url: body.linkedinUrl ?? null,
            p_phone: body.phone ?? null,
            p_monthly_audience: body.monthlyAudience ?? null,
            p_approx_clients: body.approxClients ?? null,
            p_motivation: body.motivation ?? null,
            p_experience: body.experience ?? null,
            p_marketing_channels: body.marketingChannels ?? null,
            p_user_id: userId,
          },
        );
        if (error) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        return Response.json({ applicationId: data }, { status: 201 });
      },
    },
  },
});
