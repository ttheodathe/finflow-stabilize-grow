import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";

// Lazy: process.env is only populated per-request in the worker runtime.
let _resend: Resend | undefined;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_INVOICES = 50;

// SECURITY: sends a payment reminder from our domain. The caller must be signed in and an active
// (non-viewer) member of the company that owns the invoices. The recipient is ALWAYS the
// customer's email on file; the browser only supplies invoice ids and the message the user
// reviewed and edited. Replies go to the sender, not to us.
export const Route = createFileRoute("/api/send-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { authenticate, getActiveRoleKey } = await import("@/lib/api-auth.server");
          const caller = await authenticate(request);
          if (caller instanceof Response) return caller;

          const body = await request.json().catch(() => ({}));
          const invoiceIds: string[] = Array.isArray(body?.invoiceIds)
            ? body.invoiceIds.filter((v: unknown): v is string => typeof v === "string")
            : [];
          const message = typeof body?.message === "string" ? body.message.trim() : "";

          if (invoiceIds.length === 0 || invoiceIds.length > MAX_INVOICES) {
            return Response.json({ error: "Choose between 1 and 50 invoices" }, { status: 400 });
          }
          if (!message) {
            return Response.json({ error: "The message is empty" }, { status: 400 });
          }
          if (message.length > MAX_MESSAGE_LENGTH) {
            return Response.json(
              { error: `The message is too long (max ${MAX_MESSAGE_LENGTH} characters)` },
              { status: 400 },
            );
          }

          const { data: invoices } = await caller.admin
            .from("invoices")
            .select("id, company_id, customer_id, status, customers(name, email)")
            .in("id", invoiceIds);
          if (!invoices || invoices.length !== new Set(invoiceIds).size) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          const companyId = invoices[0].company_id;
          const customerId = invoices[0].customer_id;
          if (
            !customerId ||
            invoices.some(
              (i: { company_id: string; customer_id: string | null }) =>
                i.company_id !== companyId || i.customer_id !== customerId,
            )
          ) {
            return Response.json(
              { error: "All invoices must belong to the same company and customer" },
              { status: 400 },
            );
          }

          const role = await getActiveRoleKey(caller.admin, caller.userId, companyId);
          if (!role || role === "viewer") {
            return Response.json({ error: "Not allowed to send reminders" }, { status: 403 });
          }

          const customer = Array.isArray(invoices[0].customers)
            ? invoices[0].customers[0]
            : invoices[0].customers;
          if (!customer?.email) {
            return Response.json(
              { error: "This customer has no email address on file" },
              { status: 400 },
            );
          }

          const { data: company } = await caller.admin
            .from("companies")
            .select("name")
            .eq("id", companyId)
            .maybeSingle();
          const companyName = company?.name || "FinFlowTrack";

          const { data, error } = await getResend().emails.send({
            from: `${companyName} via FinFlowTrack <invoices@finflowtrack.com>`,
            to: [customer.email],
            replyTo: caller.email ?? undefined,
            subject: `Payment reminder from ${companyName}`,
            text: `${message}\n\n--\nSent by ${companyName} using FinFlowTrack.`,
          });

          if (error) {
            console.error(error);
            return Response.json({ error: "Failed sending the reminder" }, { status: 500 });
          }
          return Response.json({ success: true, id: data?.id, sentTo: customer.email });
        } catch (error) {
          console.error(error);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
