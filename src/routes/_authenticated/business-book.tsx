import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { QuickSale } from "@/components/business-book/quick-sale";
import { SalesSummary } from "@/components/business-book/sales-summary";
import { localDateKey, sumByCurrency, formatCurrencyTotals } from "@/lib/business-book";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  CircleAlert,
  ClipboardList,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

const supabase = _sb as any;

export const Route = createFileRoute("/_authenticated/business-book")({
  head: () => ({ meta: [{ title: "Business Book — FinFlow Track" }] }),
  component: BusinessBookPage,
});

type InvoiceRow = {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: string;
  issue_date: string;
  created_at: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string | null;
  vendor: string | null;
  category: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  reorder_level: number | null;
};

type BalanceRow = {
  item_id: string;
  quantity_available: number | null;
};

type ActivityRow = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  currency: string;
  date: string;
  kind: "sale" | "payment" | "expense";
};

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency || "USD"} ${Number(amount || 0).toFixed(2)}`;
  }
}

function BusinessBookPage() {
  const companyId = useActiveCompanyId();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    async function load() {
      const today = localDateKey();
      const [invoiceResult, paymentResult, expenseResult, productResult, balanceResult] =
        await Promise.all([
          supabase
            .from("invoices")
            .select("id,invoice_number,total,currency,status,issue_date,created_at")
            .eq("company_id", companyId)
            .eq("issue_date", today)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("payments")
            .select("id,amount,currency,payment_date,created_at")
            .eq("company_id", companyId)
            .eq("payment_date", today)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("expenses")
            .select("id,amount,currency,expense_date,description,vendor,category,created_at")
            .eq("company_id", companyId)
            .eq("expense_date", today)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("items")
            .select("id,name,sku,reorder_level")
            .eq("company_id", companyId)
            .eq("type", "product")
            .eq("track_inventory", true)
            .eq("is_active", true)
            .limit(500),
          supabase
            .from("inventory_balances")
            .select("item_id,quantity_available")
            .eq("company_id", companyId),
        ]);

      if (cancelled) return;
      const failed = [
        invoiceResult,
        paymentResult,
        expenseResult,
        productResult,
        balanceResult,
      ].some((result) => result.error);

      if (failed) {
        setLoadError(true);
        setLoading(false);
        return;
      }

      setInvoices((invoiceResult.data ?? []) as InvoiceRow[]);
      setPayments((paymentResult.data ?? []) as PaymentRow[]);
      setExpenses((expenseResult.data ?? []) as ExpenseRow[]);
      setProducts((productResult.data ?? []) as ProductRow[]);
      setBalances((balanceResult.data ?? []) as BalanceRow[]);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, reloadKey]);

  const salesTotals = useMemo(
    () =>
      sumByCurrency(
        invoices
          .filter((invoice) => invoice.status !== "draft")
          .map((invoice) => ({
            amount: invoice.total,
            currency: invoice.currency,
          })),
      ),
    [invoices],
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

  const expenseTotals = useMemo(
    () =>
      sumByCurrency(
        expenses.map((expense) => ({
          amount: expense.amount,
          currency: expense.currency,
        })),
      ),
    [expenses],
  );

  const lowStockProducts = useMemo(() => {
    const availableByItem = new Map<string, number>();
    for (const balance of balances) {
      availableByItem.set(
        balance.item_id,
        (availableByItem.get(balance.item_id) ?? 0) + Number(balance.quantity_available ?? 0),
      );
    }

    return products
      .filter((product) => {
        const reorderLevel = Number(product.reorder_level ?? 0);
        return reorderLevel > 0 && (availableByItem.get(product.id) ?? 0) <= reorderLevel;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [balances, products]);

  const activity = useMemo<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [
      ...invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: `Sale · ${invoice.invoice_number}`,
        detail: invoice.status === "draft" ? "Draft invoice" : `Invoice · ${invoice.status}`,
        amount: Number(invoice.total),
        currency: invoice.currency,
        date: invoice.created_at,
        kind: "sale" as const,
      })),
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        title: "Payment received",
        detail: "Customer payment",
        amount: Number(payment.amount),
        currency: payment.currency,
        date: payment.created_at,
        kind: "payment" as const,
      })),
      ...expenses.map((expense) => ({
        id: `expense-${expense.id}`,
        title: expense.description || expense.category || "Business expense",
        detail: expense.vendor ? `Paid to ${expense.vendor}` : "Expense recorded",
        amount: Number(expense.amount),
        currency: expense.currency,
        date: expense.created_at,
        kind: "expense" as const,
      })),
    ];

    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [expenses, invoices, payments]);

  const todayLabel = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const actions = [
    {
      to: "/invoices" as const,
      title: "Record a sale",
      description: "Create a sale or customer invoice",
      icon: ShoppingCart,
    },
    {
      to: "/purchases/orders" as const,
      title: "Record a purchase",
      description: "Order goods and receive stock",
      icon: PackagePlus,
    },
    {
      to: "/expenses" as const,
      title: "Add an expense",
      description: "Record rent, transport and other costs",
      icon: ReceiptText,
    },
    {
      to: "/items/products" as const,
      title: "Manage products",
      description: "Set prices, costs and product details",
      icon: Boxes,
    },
    {
      to: "/customers" as const,
      title: "Customers",
      description: "View customer records and sales history",
      icon: Users,
    },
    {
      to: "/items/inventory" as const,
      title: "View stock",
      description: "Check quantities and inventory",
      icon: ClipboardList,
    },
  ];

  if (!companyId) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Business Book</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a company to view its daily business records.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Daily business workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Business Book</h1>
          <p className="mt-1 text-muted-foreground">
            Record everyday business activity and keep sales, expenses and stock in one place.
          </p>
          <p className="mt-2 text-sm font-medium">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuickSale companyId={companyId} onSaved={() => setReloadKey((key) => key + 1)} />
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Sales recorded today</CardDescription>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {loading ? "Loading…" : formatCurrencyTotals(salesTotals)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {invoices.filter((invoice) => invoice.status !== "draft").length} non-draft invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Money received today</CardDescription>
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {loading ? "Loading…" : formatCurrencyTotals(paymentTotals)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Payments recorded today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Expenses recorded today</CardDescription>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {loading ? "Loading…" : formatCurrencyTotals(expenseTotals)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{expenses.length} expense entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Products at reorder level</CardDescription>
            <CircleAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? "…" : lowStockProducts.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on available stock across warehouses
            </p>
          </CardContent>
        </Card>
      </div>

      <SalesSummary companyId={companyId} reloadToken={reloadKey} />

      <Card>
        <CardHeader>
          <CardTitle>What would you like to record?</CardTitle>
          <CardDescription>
            Choose an action. FinFlow keeps the underlying business and accounting records
            connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex min-h-24 items-center gap-3 rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{action.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {action.description}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today's entries</CardTitle>
            <CardDescription>
              Sales, payments and expenses recorded for this business today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium">We couldn't load today's records.</p>
                <p className="mt-1 text-muted-foreground">
                  Your data has not been changed. Refresh to try again.
                </p>
              </div>
            ) : loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading today's entries…
              </p>
            ) : activity.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No entries yet today</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record your first sale, payment or expense to start today's book.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {activity.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      {entry.kind === "sale" ? (
                        <ShoppingCart className="h-4 w-4" />
                      ) : entry.kind === "payment" ? (
                        <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ReceiptText className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{entry.title}</span>
                      <span className="block text-xs text-muted-foreground">{entry.detail}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-semibold">
                      {formatAmount(entry.amount, entry.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Stock to check</CardTitle>
              <Badge variant={lowStockProducts.length > 0 ? "destructive" : "secondary"}>
                {loading ? "…" : lowStockProducts.length}
              </Badge>
            </div>
            <CardDescription>Products at or below their configured reorder level.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Checking inventory…</p>
            ) : lowStockProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Boxes className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No products are currently at their reorder level.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 6).map((product) => {
                  const available = balances
                    .filter((balance) => balance.item_id === product.id)
                    .reduce((total, balance) => total + Number(balance.quantity_available ?? 0), 0);
                  return (
                    <div key={product.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku || "No SKU"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{available}</p>
                        <p className="text-xs text-muted-foreground">
                          Reorder at {Number(product.reorder_level)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <Link
                  to="/items/inventory"
                  className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
                >
                  Open inventory <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Sales recorded are invoice totals, while money received comes from payment records. They are
        shown separately and are not added together. Amounts remain grouped by their original
        currency; no exchange-rate conversion is assumed.
      </p>
    </div>
  );
}
