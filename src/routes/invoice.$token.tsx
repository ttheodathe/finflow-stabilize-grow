import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencies";
import { AlertTriangle, FileText } from "lucide-react";

export const Route = createFileRoute("/invoice/$token")({
  head: () => ({ meta: [{ title: "Invoice — Finflow Track" }] }),
  component: PublicInvoicePage,
});

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type PublicInvoice = {
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  customer_name: string | null;
  company_name: string | null;
  items: InvoiceItem[];
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-700";
    case "overdue":
      return "bg-rose-500/10 text-rose-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function PublicInvoicePage() {
  const { token } = Route.useParams();
  const [invoice, setInvoice] = useState<PublicInvoice | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_public_invoice", {
        p_token: token,
      });
      if (error || !data) {
        setInvoice(null);
        return;
      }
      setInvoice(data as PublicInvoice);
    })();
  }, [token]);

  if (invoice === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (invoice === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Invoice not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This link may be invalid or the invoice may no longer be available. Contact the sender
          if you believe this is a mistake.
        </p>
      </div>
    );
  }

  const fmt = (n: number) => formatCurrency(n, invoice.currency);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="h-5 w-5" />
              {invoice.company_name ?? "Finflow Track"}
            </div>
            <h1 className="mt-2 text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(invoice.status)}`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Billed to</div>
            <div className="font-medium">{invoice.customer_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Issue date</div>
            <div className="font-medium">{invoice.issue_date}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Due date</div>
            <div className="font-medium">{invoice.due_date ?? "—"}</div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit price</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">
                    No line items.
                  </td>
                </tr>
              ) : (
                invoice.items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{it.description}</td>
                    <td className="px-4 py-2 text-right">{it.quantity}</td>
                    <td className="px-4 py-2 text-right">{fmt(it.unit_price)}</td>
                    <td className="px-4 py-2 text-right">{fmt(it.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-4 w-full max-w-[240px] space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{fmt(invoice.tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-bold">
            <span>Total</span>
            <span>{fmt(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            {invoice.notes}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by Finflow Track
        </p>
      </div>
    </div>
  );
}
