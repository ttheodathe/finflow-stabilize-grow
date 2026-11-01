import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import InvoiceCreated from "@/emails/InvoiceCreated";

// Lazy: process.env is only populated per-request in the worker runtime.
let _resend: Resend | undefined;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// SECURITY: this route sends email from our domain. The caller sends only { invoiceId } with
// their session token; the recipient, amounts and link come from the database, and the caller
// must be an active member of the company that owns the invoice. It can no longer be used to
// send arbitrary email to arbitrary people.
export const Route = createFileRoute("/api/send-invoice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { authenticate, getActiveRoleKey, SITE_URL } =
            await import("@/lib/api-auth.server");
          const caller = await authenticate(request);
          if (caller instanceof Response) return caller;

          const body = await request.json().catch(() => ({}));
          const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
          if (!invoiceId) {
            return Response.json({ error: "invoiceId is required" }, { status: 400 });
          }

          const { data: invoice } = await caller.admin
            .from("invoices")
            .select(
              "id, company_id, invoice_number, total, currency, due_date, share_token, customers(name, email)",
            )
            .eq("id", invoiceId)
            .maybeSingle();
          if (!invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          const role = await getActiveRoleKey(caller.admin, caller.userId, invoice.company_id);
          if (!role) {
            return Response.json({ error: "Not allowed to send this invoice" }, { status: 403 });
          }

          const customer = Array.isArray(invoice.customers)
            ? invoice.customers[0]
            : invoice.customers;
          if (!customer?.email) {
            return Response.json({ error: "Customer email is required" }, { status: 400 });
          }
          if (!invoice.share_token) {
            return Response.json({ error: "Invoice has no share link" }, { status: 409 });
          }

          const { data: company } = await caller.admin
            .from("companies")
            .select("name")
            .eq("id", invoice.company_id)
            .maybeSingle();
          const companyName = company?.name || "FinFlowTrack";

          const { data, error } = await getResend().emails.send({
            from: "FinFlowTrack <invoices@finflowtrack.com>",
            to: [customer.email],
            subject: `Invoice ${invoice.invoice_number} from ${companyName}`,
            react: (
              <InvoiceCreated
                customerName={customer.name || "Customer"}
                companyName={companyName}
                invoiceNumber={invoice.invoice_number}
                amount={Number(invoice.total).toFixed(2)}
                currency={invoice.currency || "USD"}
                dueDate={invoice.due_date}
                invoiceUrl={`${SITE_URL}/invoice/${invoice.share_token}`}
              />
            ),
          });

          if (error) {
            console.error(error);
            return Response.json({ error: "Failed sending invoice" }, { status: 500 });
          }
          return Response.json({ success: true, id: data?.id });
        } catch (error) {
          console.error(error);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
