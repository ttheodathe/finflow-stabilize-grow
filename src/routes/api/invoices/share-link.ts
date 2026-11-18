import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/invoices/share-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { authenticate, getActiveRoleKey } =
            await import("@/lib/api-auth.server");
          const caller = await authenticate(request);
          if (caller instanceof Response) return caller;

          const body = await request.json().catch(() => ({}));
          const invoiceId =
            typeof body?.invoiceId === "string" ? body.invoiceId : "";
          const action = body?.action;
          if (!invoiceId || (action !== "revoke" && action !== "regenerate")) {
            return Response.json(
              { error: "A valid invoiceId and action are required" },
              { status: 400 },
            );
          }

          const { data: invoice, error: invoiceError } = await caller.admin
            .from("invoices")
            .select("id, company_id")
            .eq("id", invoiceId)
            .maybeSingle();
          if (invoiceError || !invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          const role = await getActiveRoleKey(
            caller.admin,
            caller.userId,
            invoice.company_id,
          );
          if (!role || role === "viewer") {
            return Response.json({ error: "Not allowed to manage this invoice link" }, { status: 403 });
          }

          const update =
            action === "revoke"
              ? { share_token_revoked_at: new Date().toISOString() }
              : {
                  share_token: randomUUID(),
                  share_token_revoked_at: null,
                  share_token_expires_at: new Date(
                    Date.now() + 90 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                };

          const { data, error } = await caller.admin
            .from("invoices")
            .update(update)
            .eq("id", invoiceId)
            .eq("company_id", invoice.company_id)
            .select(
              "share_token, share_token_expires_at, share_token_revoked_at",
            )
            .single();

          if (error || !data) {
            console.error("[invoices] share-link update failed:", error);
            return Response.json(
              { error: "Unable to update invoice sharing link" },
              { status: 500 },
            );
          }

          return Response.json({
            shareToken: data.share_token,
            expiresAt: data.share_token_expires_at,
            revokedAt: data.share_token_revoked_at,
          });
        } catch (error) {
          console.error("[invoices] share-link handler failed:", error);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
