import { createFileRoute } from "@tanstack/react-router";

// Public route, but every response requires a valid, unrevoked partner API
// key — there is no partner data returned without one. Hashing the
// presented key and comparing against key_hash means the plaintext key
// itself is never stored anywhere after creation (see
// partnerApiKeys.service.ts), so a database read alone can't leak keys.
export const Route = createFileRoute("/api/public/partners/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apiKey = request.headers.get("X-API-Key");
        if (!apiKey) return new Response("Missing X-API-Key header", { status: 401 });

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: service-role client typed loosely, matches pattern used elsewhere
        const admin = _admin as any;

        const keyHash = await sha256Hex(apiKey);
        const { data: keyRow } = await admin
          .from("partner_api_keys")
          .select("id, partner_id, revoked_at")
          .eq("key_hash", keyHash)
          .maybeSingle();

        if (!keyRow || keyRow.revoked_at) {
          return new Response("Invalid or revoked API key", { status: 401 });
        }

        void admin
          .from("partner_api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", keyRow.id);

        const partnerId = keyRow.partner_id;
        const [partnerRes, clicksRes, attributionsRes, commissionsRes] = await Promise.all([
          admin
            .from("partners")
            .select("business_name, referral_code, status, commission_rate")
            .eq("id", partnerId)
            .maybeSingle(),
          admin
            .from("partner_referral_clicks")
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId),
          admin
            .from("partner_referral_attributions")
            .select("id", { count: "exact", head: true })
            .eq("last_touch_partner_id", partnerId),
          admin
            .from("partner_commissions")
            .select("status, commission_amount, currency")
            .eq("partner_id", partnerId),
        ]);

        const commissions = commissionsRes.data ?? [];
        const sum = (statuses: string[]) =>
          commissions
            .filter((c: { status: string }) => statuses.includes(c.status))
            .reduce(
              (acc: number, c: { commission_amount: number }) => acc + Number(c.commission_amount),
              0,
            );

        return Response.json({
          partner: partnerRes.data,
          clicks: clicksRes.count ?? 0,
          signups: attributionsRes.count ?? 0,
          commissions: {
            pending: sum(["pending"]),
            approved: sum(["approved"]),
            paid: sum(["paid"]),
            currency: commissions[0]?.currency ?? "USD",
          },
        });
      },
    },
  },
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
