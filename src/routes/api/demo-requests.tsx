import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Resend } from "resend";
import { createFileRoute } from "@tanstack/react-router";
import { demoRequestSchema } from "@/lib/demo-request-validation";

const MAX_BODY_BYTES = 12_000;
const ALLOWED_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "closed",
  "spam",
] as const;

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function getAdminContext(request: Request) {
  const configuredEmails = (process.env.DEMO_REQUEST_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (configuredEmails.length === 0) {
    return {
      response: Response.json(
        { error: "Demo request management is not configured." },
        { status: 503 },
      ),
    };
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: Response.json({ error: "Not signed in." }, { status: 401 }) };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // The service-role client is used only after the caller is authenticated and allowlisted.
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.email) {
    return { response: Response.json({ error: "Invalid session." }, { status: 401 }) };
  }
  if (!configuredEmails.includes(String(data.user.email).toLowerCase())) {
    return { response: Response.json({ error: "Not authorized." }, { status: 403 }) };
  }
  return { admin };
}

export const Route = createFileRoute("/api/demo-requests")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await getAdminContext(request);
          if ("response" in context) return context.response;
          const url = new URL(request.url);
          const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
          const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
          const { data, error } = await context.admin
            .from("demo_requests")
            .select(
              "id, full_name, business_name, email, business_type, challenge, preferred_time, phone, demo_contact_consent, marketing_consent, status, created_at",
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
          if (error) {
            console.error("[demo-requests] management read failed", { code: error.code });
            return Response.json({ error: "Unable to load demo requests." }, { status: 500 });
          }
          return Response.json({ requests: data ?? [], limit, offset });
        } catch (error) {
          console.error("[demo-requests] management read failed", error);
          return Response.json({ error: "Unable to load demo requests." }, { status: 503 });
        }
      },
      PATCH: async ({ request }) => {
        try {
          const context = await getAdminContext(request);
          if ("response" in context) return context.response;
          const body = await request.json().catch(() => null);
          if (
            !body ||
            typeof body.id !== "string" ||
            !(ALLOWED_STATUSES as readonly string[]).includes(body.status)
          ) {
            return Response.json(
              { error: "A valid request id and status are required." },
              { status: 400 },
            );
          }
          const { data, error } = await context.admin
            .from("demo_requests")
            .update({ status: body.status })
            .eq("id", body.id)
            .select("id, status")
            .maybeSingle();
          if (error) {
            console.error("[demo-requests] management update failed", { code: error.code });
            return Response.json({ error: "Unable to update demo request." }, { status: 500 });
          }
          if (!data) return Response.json({ error: "Demo request not found." }, { status: 404 });
          return Response.json({ request: data });
        } catch (error) {
          console.error("[demo-requests] management update failed", error);
          return Response.json({ error: "Unable to update demo request." }, { status: 503 });
        }
      },
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
          const parsedBody: unknown = JSON.parse(rawBody);
          if (parsedBody === null || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
            return Response.json({ error: "Invalid request body." }, { status: 400 });
          }
          body = parsedBody as Record<string, unknown>;
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

        // Vercel overwrites x-real-ip with its calculated client IP. Do not trust
        // arbitrary forwarded-header chains supplied by a caller.
        const ip = request.headers.get("x-real-ip")?.trim() ?? "";
        if (!ip || !isIP(ip)) {
          return Response.json({ error: "Unable to verify request origin." }, { status: 400 });
        }

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
          return Response.json(
            { error: "Demo requests are temporarily unavailable." },
            { status: 503 },
          );
        }

        try {
          const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
          // The service-role client is server-only. The new demo tables are not
          // represented in the generated Supabase Database type yet.
          const admin = _admin as any;

          const ipHash = hmac(`demo-request-ip:${ip}`, serviceKey);
          const { data: allowed, error: rateLimitError } = await admin.rpc(
            "consume_demo_request_rate_limit",
            { p_ip_hash: ipHash },
          );
          if (rateLimitError) {
            console.error("[demo-requests] rate-limit check failed", {
              code: rateLimitError.code,
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
          const fingerprint = hmac(`demo-request-email:${parsed.data.email}:${day}`, serviceKey);
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
            console.error("[demo-requests] insert failed", { code: insertError.code });
            return Response.json(
              { error: "We couldn't save your request. Please try again later." },
              { status: 500 },
            );
          }

          // Internal notification only. No email is sent to the person requesting a demo.
          const notificationEmail = process.env.DEMO_REQUEST_NOTIFICATION_EMAIL;
          const resendKey = process.env.RESEND_API_KEY;
          if (notificationEmail && resendKey) {
            try {
              const resend = new Resend(resendKey);
              const { error } = await resend.emails.send({
                from: "FinFlowTrack <invoices@finflowtrack.com>",
                to: [notificationEmail],
                subject: `New demo request: ${parsed.data.businessName}`,
                text: [
                  "A new demo request was saved in FinFlowTrack.",
                  `Name: ${parsed.data.fullName}`,
                  `Business: ${parsed.data.businessName}`,
                  `Email: ${parsed.data.email}`,
                  `Business type: ${parsed.data.businessType}`,
                  `Preferred time: ${parsed.data.preferredTime}`,
                  `Phone: ${parsed.data.phone || "Not provided"}`,
                  `Challenge: ${parsed.data.challenge}`,
                  `Marketing consent: ${parsed.data.marketingConsent ? "Yes" : "No"}`,
                ].join("\n"),
              });
              if (error) console.error("[demo-requests] internal notification failed", { name: error.name });
            } catch (notificationError) {
              console.error("[demo-requests] internal notification failed", notificationError);
            }
          } else {
            console.warn("[demo-requests] internal notification not configured; request remains stored");
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
