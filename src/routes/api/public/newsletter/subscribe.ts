import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Deliberately permissive but sane — this only gates obviously malformed input;
// real verification (bounces, confirmation) happens at the email-sending layer.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Resolve a Supabase client for the newsletter write.
 * Prefers the service-role key; falls back to the publishable/anon key
 * (the table has an insert-only policy for anon) so the form keeps working
 * on deployments where only the public keys are configured.
 */
function resolveClient() {
  const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const key =
    env("SUPABASE_SERVICE_ROLE_KEY") ??
    env("SUPABASE_PUBLISHABLE_KEY") ??
    env("VITE_SUPABASE_PUBLISHABLE_KEY") ??
    env("SUPABASE_ANON_KEY") ??
    env("VITE_SUPABASE_ANON_KEY");

  if (!url || !key) {
    console.error("[newsletter] missing Supabase env", {
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
    });
    return null;
  }

  return createClient(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // Only the new opaque key format (sb_publishable_/sb_secret_) is
        // invalid as a Bearer token — legacy JWT keys (anon or service_role)
        // NEED Authorization: Bearer <jwt> for PostgREST/Kong to resolve the
        // correct Postgres role. Stripping it unconditionally (the previous
        // behavior here) made every request 401 whenever a legacy JWT key
        // was configured, which is what was actually deployed.
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

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

        try {
          const client = resolveClient();
          if (!client) {
            return Response.json(
              { error: "Newsletter signup is not configured yet." },
              { status: 503 },
            );
          }

          const { error } = await client.from("newsletter_subscribers").upsert(
            {
              email,
              source: body.source ?? "footer",
              status: "subscribed",
              unsubscribed_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" },
          );

          if (error) {
            // Surface the real cause in logs (missing table, missing grant, RLS, …)
            console.error("[newsletter] upsert failed", {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
            return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
          }

          return Response.json({ ok: true }, { status: 200 });
        } catch (err) {
          console.error("[newsletter] handler crashed", err);
          return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
        }
      },
    },
  },
});
