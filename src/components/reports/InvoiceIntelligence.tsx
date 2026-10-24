import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Printer, Mail, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currencies";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { summarizeReceivables, draftReminder, type ReceivableRow } from "@/lib/receivables-summary";

function csvDownload(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function InvoiceIntelligence() {
  const companyId = useActiveCompanyId();
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [reminderText, setReminderText] = useState("");
  const asOf = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await (supabase as any).rpc("invoice_receivable_balances", {
        _company_id: companyId,
        _as_of: asOf,
      });
      if (err) {
        setError(err.message);
        setRows([]);
      } else {
        setRows((data ?? []) as ReceivableRow[]);
      }
      setLoading(false);
    })();
  }, [companyId, asOf]);

  const summaries = useMemo(() => summarizeReceivables(rows, asOf), [rows, asOf]);
  const active = summaries.find((s) => s.currency === currency) ?? summaries[0];
  const fmt = (n: number, c = active?.currency ?? "USD") => formatCurrency(n, c);

  function openReminder(customer: string) {
    if (!active) return;
    const text = draftReminder({
      customer,
      currency: active.currency,
      rows,
      format: (n, c) => formatCurrency(n, c),
    });
    if (!text) {
      toast.info("This customer has no overdue invoices in this currency.");
      return;
    }
    setReminderFor(customer);
    setReminderText(text);
  }

  function exportCsv() {
    if (!active) return;
    const list = rows.filter((r) => r.currency === active.currency);
    csvDownload(
      `invoice-summary-${active.currency}`,
      [
        "Invoice",
        "Customer",
        "Currency",
        "Status",
        "Due date",
        "Total",
        "Paid",
        "Credited",
        "Balance",
        "Days overdue",
      ],
      list.map((r) => [
        r.invoice_number,
        r.customer_name ?? "Unassigned",
        r.currency,
        r.status,
        r.due_date ?? "",
        Number(r.total),
        Number(r.amount_paid),
        Number(r.amount_credited),
        Number(r.balance),
        r.days_overdue,
      ]),
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading invoice summary…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-destructive/40 p-4 text-sm">
        <p className="font-medium">The invoice summary could not be loaded.</p>
        <p className="mt-1 text-muted-foreground">
          {error}. If this mentions a missing function, the database migration
          <code className="mx-1">20261021000000_invoice_receivable_balances.sql</code>
          has not been applied yet.
        </p>
      </div>
    );
  if (!active)
    return (
      <p className="text-muted-foreground">
        No outstanding invoices. Sent and partially paid invoices with a balance will appear here.
      </p>
    );

  const stat = (label: string, value: number, hint?: string) => (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{fmt(value)}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <p className="text-muted-foreground max-w-2xl">
          Actual balances as of {asOf}: invoice total minus recorded payments and issued credit
          notes. Draft, paid and void invoices are excluded. These are not forecasts, and nothing
          here counts as cash received.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {summaries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-sm text-muted-foreground">Currency:</span>
          {summaries.map((s) => (
            <Button
              key={s.currency}
              size="sm"
              variant={s.currency === active.currency ? "default" : "outline"}
              onClick={() => setCurrency(s.currency)}
            >
              {s.currency}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground">
            Currencies are never added together.
          </span>
        </div>
      )}

      <h2 className="hidden print:block text-xl font-semibold">
        Invoice summary ({active.currency}) — {asOf}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stat("Total outstanding", active.outstanding, `${active.invoiceCount} open invoices`)}
        {stat("Overdue", active.overdue, `${active.overdueCount} overdue invoices`)}
        {stat("Due in next 7 days", active.dueNext7)}
        {stat("Due in next 30 days", active.dueNext30, "Includes the next 7 days")}
        {stat("Due in next 60 days", active.dueNext60, "Includes the next 30 days")}
        {active.noDueDate > 0 &&
          stat("No due date set", active.noDueDate, "Counted in outstanding only")}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 font-semibold">Balance by customer</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Customer</th>
                  <th className="p-2 text-right">Outstanding</th>
                  <th className="p-2 text-right">Overdue</th>
                  <th className="p-2 print:hidden" />
                </tr>
              </thead>
              <tbody>
                {active.byCustomer.map((c) => (
                  <tr key={c.customer} className="border-t">
                    <td className="p-2">{c.customer}</td>
                    <td className="p-2 text-right tabular-nums">{fmt(c.outstanding)}</td>
                    <td className="p-2 text-right tabular-nums">{fmt(c.overdue)}</td>
                    <td className="p-2 text-right print:hidden">
                      {c.overdue > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => openReminder(c.customer)}>
                          <Mail className="mr-1 h-3.5 w-3.5" /> Draft reminder
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Largest outstanding invoices</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Due</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {active.topInvoices.map((r) => (
                  <tr key={r.invoice_id} className="border-t">
                    <td className="p-2">{r.invoice_number}</td>
                    <td className="p-2">{r.customer_name ?? "Unassigned"}</td>
                    <td className="p-2">{r.due_date ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums">{fmt(Number(r.balance))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mb-2 mt-6 font-semibold">Payment status</h3>
          <ul className="text-sm text-muted-foreground">
            {Object.entries(active.statusCounts).map(([s, n]) => (
              <li key={s}>
                {s}: {n} invoice{n === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {reminderFor && (
        <section className="rounded-lg border p-4 print:hidden">
          <h3 className="mb-1 font-semibold">Reminder draft for {reminderFor}</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            This is a draft only. Review and edit it, then copy it into your own email. Nothing is
            sent automatically.
          </p>
          <textarea
            className="min-h-48 w-full rounded-md border bg-background p-3 text-sm"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            aria-label={`Payment reminder draft for ${reminderFor}`}
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(reminderText);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReminderFor(null)}>
              Close
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
