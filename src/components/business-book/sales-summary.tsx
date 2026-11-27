import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sumByCurrency, formatCurrencyTotals, localDateKey } from "@/lib/business-book";
import { Download, RefreshCw, TrendingUp } from "lucide-react";

import { supabase as _sb } from "@/integrations/supabase/client";

const supabase = _sb as any;
const EXCLUDED_SALE_STATUSES = new Set(["draft", "void", "voided", "cancelled", "canceled"]);
const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;

type InvoiceRow = {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: string;
  issue_date: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  method: string | null;
  reference: string | null;
};

type DailyRow = {
  date: string;
  currency: string;
  sales: number;
  salesCount: number;
  payments: number;
  paymentCount: number;
};

type RangePreset = "7" | "30" | "month" | "custom";

function shiftDate(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function firstDayOfMonth(dateKey: string) {
  return dateKey.slice(0, 8) + "01";
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}

async function fetchAllRows<T>(buildQuery: () => any): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

function exportSalesCsv(invoices: InvoiceRow[], payments: PaymentRow[], from: string, to: string) {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows: (string | number)[][] = [
    ["Type", "Date", "Reference", "Status or method", "Amount", "Currency"],
    ...invoices.map((invoice) => [
      "Sale",
      invoice.issue_date,
      invoice.invoice_number,
      invoice.status,
      invoice.total,
      invoice.currency,
    ]),
    ...payments.map((payment) => [
      "Payment",
      payment.payment_date,
      payment.reference || payment.id,
      payment.method || "Not specified",
      payment.amount,
      payment.currency,
    ]),
  ];
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `finflow-sales-summary-${from}-to-${to}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SalesSummary({
  companyId,
  reloadToken,
}: {
  companyId: string;
  reloadToken: number;
}) {
  const today = localDateKey();
  const [from, setFrom] = useState(() => shiftDate(today, -6));
  const [to, setTo] = useState(today);
  const [preset, setPreset] = useState<RangePreset>("7");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function applyPreset(nextPreset: Exclude<RangePreset, "custom">) {
    const end = localDateKey();
    setTo(end);
    setFrom(
      nextPreset === "7"
        ? shiftDate(end, -6)
        : nextPreset === "30"
          ? shiftDate(end, -29)
          : firstDayOfMonth(end),
    );
    setPreset(nextPreset);
  }

  useEffect(() => {
    if (!companyId) return;
    if (!from || !to || from > to) {
      setError("Choose a valid date range. The start date must be on or before the end date.");
      setLoading(false);
      setInvoices([]);
      setPayments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [invoiceResult, paymentResult] = await Promise.all([
          fetchAllRows<InvoiceRow>(() =>
            supabase
              .from("invoices")
              .select("id,invoice_number,total,currency,status,issue_date")
              .eq("company_id", companyId)
              .gte("issue_date", from)
              .lte("issue_date", to)
              .order("issue_date", { ascending: false }),
          ),
          fetchAllRows<PaymentRow>(() =>
            supabase
              .from("payments")
              .select("id,amount,currency,payment_date,method,reference")
              .eq("company_id", companyId)
              .gte("payment_date", from)
              .lte("payment_date", to)
              .order("payment_date", { ascending: false }),
          ),
        ]);

        if (cancelled) return;
        setInvoices(invoiceResult.rows);
        setPayments(paymentResult.rows);
        setTruncated(invoiceResult.truncated || paymentResult.truncated);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : "Could not load the sales summary.",
        );
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, from, to, reloadToken, refreshKey]);

  const sales = useMemo(
    () => invoices.filter((invoice) => !EXCLUDED_SALE_STATUSES.has(invoice.status.toLowerCase())),
    [invoices],
  );
  const salesTotals = useMemo(
    () =>
      sumByCurrency(
        sales.map((invoice) => ({
          amount: invoice.total,
          currency: invoice.currency,
        })),
      ),
    [sales],
  );
  const paymentTotals = useMemo(
    () =>
      sumByCurrency(
        payments.map((payment) => ({
          amount: payment.amount,
          currency: payment.currency,
        })),
      ),
    [payments],
  );
  const openInvoiceCount = sales.filter((invoice) => {
    const status = invoice.status.toLowerCase();
    return !["paid", "void", "voided", "cancelled", "canceled"].includes(status);
  }).length;

  const dailyRows = useMemo(() => {
    const grouped = new Map<string, DailyRow>();
    const getRow = (date: string, currency: string) => {
      const normalizedCurrency = (currency || "USD").toUpperCase();
      const key = `${date}|${normalizedCurrency}`;
      const existing = grouped.get(key);
      if (existing) return existing;
      const row: DailyRow = {
        date,
        currency: normalizedCurrency,
        sales: 0,
        salesCount: 0,
        payments: 0,
        paymentCount: 0,
      };
      grouped.set(key, row);
      return row;
    };

    for (const invoice of sales) {
      const row = getRow(invoice.issue_date, invoice.currency);
      row.sales += Number(invoice.total || 0);
      row.salesCount += 1;
    }
    for (const payment of payments) {
      const row = getRow(payment.payment_date, payment.currency);
      row.payments += Number(payment.amount || 0);
      row.paymentCount += 1;
    }
    return [...grouped.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || a.currency.localeCompare(b.currency),
    );
  }, [payments, sales]);

  const recentSales = sales.slice(0, 8);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Sales summary
            </CardTitle>
            <CardDescription className="mt-1">
              Review invoices issued and payments received over a selected period.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh summary
          </Button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={preset === "7" ? "default" : "outline"}
              onClick={() => applyPreset("7")}
            >
              Last 7 days
            </Button>
            <Button
              size="sm"
              variant={preset === "30" ? "default" : "outline"}
              onClick={() => applyPreset("30")}
            >
              Last 30 days
            </Button>
            <Button
              size="sm"
              variant={preset === "month" ? "default" : "outline"}
              onClick={() => applyPreset("month")}
            >
              This month
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="sales-summary-from">From</Label>
              <Input
                id="sales-summary-from"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPreset("custom");
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sales-summary-to">To</Label>
              <Input
                id="sales-summary-to"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPreset("custom");
                }}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportSalesCsv(sales, payments, from, to)}
              disabled={loading || (sales.length === 0 && payments.length === 0) || !!error}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Sales recorded</p>
                <p className="mt-2 text-xl font-semibold">
                  {loading ? "Loading…" : formatCurrencyTotals(salesTotals)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{sales.length} invoices issued</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Payments received</p>
                <p className="mt-2 text-xl font-semibold">
                  {loading ? "Loading…" : formatCurrencyTotals(paymentTotals)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {payments.length} payment records
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Open invoices</p>
                <p className="mt-2 text-2xl font-semibold">{loading ? "…" : openInvoiceCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unpaid or partially paid invoices issued in this period
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="font-semibold">Daily activity</h3>
                <p className="text-xs text-muted-foreground">
                  Sales are grouped by invoice date; payments are grouped by payment date.
                </p>
              </div>
              {loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading activity…</p>
              ) : dailyRows.length === 0 ? (
                <div
                  className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
                >
                  No sales or payments were recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Currency</th>
                        <th className="px-3 py-2 text-right font-medium">Sales</th>
                        <th className="px-3 py-2 text-right font-medium">Invoices</th>
                        <th className="px-3 py-2 text-right font-medium">Payments received</th>
                        <th className="px-3 py-2 text-right font-medium">Payments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map((row) => (
                        <tr key={`${row.date}-${row.currency}`} className="border-t">
                          <td className="px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2">{row.currency}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.sales ? formatAmount(row.sales, row.currency) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.salesCount || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.payments ? formatAmount(row.payments, row.currency) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.paymentCount || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="mb-3">
                <h3 className="font-semibold">Recent sales in this period</h3>
                <p className="text-xs text-muted-foreground">
                  Showing up to eight non-draft, non-voided invoices.
                </p>
              </div>
              {loading ? (
                <p className="py-5 text-center text-sm text-muted-foreground">Loading sales…</p>
              ) : recentSales.length === 0 ? (
                <p
                  className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"
                >
                  No sales to display for this period.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Sale / invoice</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((invoice) => (
                        <tr key={invoice.id} className="border-t">
                          <td className="px-3 py-2">{invoice.issue_date}</td>
                          <td className="px-3 py-2 font-medium">{invoice.invoice_number}</td>
                          <td className="px-3 py-2 capitalize">
                            {invoice.status.replaceAll("_", " ")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatAmount(Number(invoice.total), invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {truncated && (
              <p className="text-xs text-amber-700">
                This report reached its 10,000-row safety limit. Narrow the date range to review
                all records.
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sales totals are based on non-draft invoices issued in the selected period. Payments
              reflect payment records dated in the selected period. These are separate events and
              are not added together. Amounts stay grouped by currency; no exchange-rate conversion
              is assumed.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
