import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createFileRoute } from "@tanstack/react-router";
import { demoRequestSchema } from "@/lib/demo-request-validation";

const MAX_BODY_BYTES = 12_000;

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export const Route = createFileRoute("/api/demo-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (contentLength > MAX_BODY_BYTES) {
          return Response.json({ error: "Request is too large." }, { status: 413 });
        }

        let body: Record<string, unknown>;
        try {
          const rawBody = await request.text();
          if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
            return Response.json({ error: "Request is too large." }, { status: 413 });
          }
          body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "Invalid JSON." }, { status: 400 });
        }

        // Honeypot: silently accept automated submissions without storing them.
        if (typeof body.website === "string" && body.website.trim().length > 0) {
          return Response.json({ ok: true }, { status: 202 });
        }

        const parsed = demoRequestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Please check the form fields and required consent." },
            { status: 400 },
          );
        }

        const forwardedFor = request.headers.get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim() ?? "";
        if (!ip || !isIP(ip)) {
          return Response.json({ error: "Unable to verify request origin." }, { status: 400 });
        }

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
          return Response.json({ error: "Demo requests are temporarily unavailable." }, { status: 503 });
        }

        try {
          const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
          // Server-only service-role client; never expose it to the browser.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const admin = _admin as any;

          const ipHash = hmac(`demo-request-ip:${ip}`, serviceKey);
          const { data: allowed, error: rateLimitError } = await admin.rpc(
            "consume_demo_request_rate_limit",
            { p_ip_hash: ipHash },
          );
          if (rateLimitError) {
            console.error("[demo-requests] rate-limit check failed", {
              code: rateLimitError.code,
              message: rateLimitError.message,
            });
            return Response.json(
              { error: "Demo requests are temporarily unavailable. Please try again later." },
              { status: 503 },
            );
          }
          if (allowed !== true) {
            return Response.json(
              { error: "Too many requests. Please try again in about an hour." },
              { status: 429, headers: { "Retry-After": "3600" } },
            );
          }

          const day = new Date().toISOString().slice(0, 10);
          const fingerprint = hmac(
            `demo-request-email:${parsed.data.email}:${day}`,
            serviceKey,
          );
          const { error: insertError } = await admin.from("demo_requests").insert({
            full_name: parsed.data.fullName,
            business_name: parsed.data.businessName,
            email: parsed.data.email,
            business_type: parsed.data.businessType,
            challenge: parsed.data.challenge,
            preferred_time: parsed.data.preferredTime,
            phone: parsed.data.phone || null,
            demo_contact_consent: parsed.data.demoContactConsent,
            marketing_consent: parsed.data.marketingConsent,
            submission_fingerprint: fingerprint,
          });

          if (insertError?.code === "23505") {
            return Response.json(
              { error: "A demo request from this email was already received today." },
              { status: 409 },
            );
          }
          if (insertError) {
            console.error("[demo-requests] insert failed", {
              code: insertError.code,
              message: insertError.message,
            });
            return Response.json(
              { error: "We couldn't save your request. Please try again later." },
              { status: 500 },
            );
          }

          return Response.json({ ok: true }, { status: 201 });
        } catch (error) {
          console.error("[demo-requests] handler failed", error);
          return Response.json(
            { error: "Demo requests are temporarily unavailable." },
            { status: 503 },
          );
        }
      },
    },
  },
});
