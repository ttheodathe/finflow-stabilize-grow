import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  FileText,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  UserPlus,
  FileSpreadsheet,
  Briefcase,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";
import { useFxRates } from "@/hooks/use-fx";
import { convert } from "@/lib/fx";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Free Accounting" }] }),
  component: Dashboard,
});

type Inv = {
  id: string;
  total: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  invoice_number: string;
  created_at: string;
  customer_id: string | null;
  currency: string;
};
type Exp = {
  id: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  category: string | null;
  created_at: string;
  currency: string;
};
type BankAcct = { id: string; current_balance: number; currency: string; is_active: boolean };

function monthBuckets(months = 6) {
  const out: { key: string; label: string; revenue: number; expenses: number }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`,
      label: x.toLocaleString("en", { month: "short" }),
      revenue: 0,
      expenses: 0,
    });
  }
  return out;
}

function Dashboard() {
  const currency = useDefaultCurrency();
  const { rates, loading: fxLoading } = useFxRates("USD");
  const fmt = (n: number) => formatCurrency(n, currency, { maximumFractionDigits: 0 });
  const conv = (amount: number, from: string) => convert(amount, from || currency, currency, rates);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [expenses, setExpenses] = useState<Exp[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAcct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, e, c, b] = await Promise.all([
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("created_at", { ascending: false }),
        supabase.from("customers").select("id,name"),
        (supabase as any)
          .from("bank_accounts")
          .select("id,current_balance,currency,is_active")
          .eq("is_active", true),
      ]);
      setInvoices((i.data ?? []) as Inv[]);
      setExpenses((e.data ?? []) as Exp[]);
      setCustomers((c.data ?? []) as { id: string; name: string }[]);
      setBankAccounts((b.data ?? []) as BankAcct[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const revenue = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + conv(Number(i.total), i.currency), 0);
    const exp = expenses.reduce((s, x) => s + conv(Number(x.amount), x.currency), 0);
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + conv(Number(i.total), i.currency), 0);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = invoices
      .filter((i) => i.status !== "paid" && i.due_date && i.due_date < today)
      .reduce((s, i) => s + conv(Number(i.total), i.currency), 0);
    const cash = bankAccounts.reduce((s, a) => s + conv(Number(a.current_balance), a.currency), 0);
    return { revenue, expenses: exp, profit: revenue - exp, cash, outstanding, overdue };
  }, [invoices, expenses, bankAccounts, rates, currency]);

  const trend = useMemo(() => {
    const b = monthBuckets(6);
    const idx = new Map(b.map((x, i) => [x.key, i]));
    for (const i of invoices) {
      if (i.status !== "paid") continue;
      const k = i.issue_date.slice(0, 7);
      const j = idx.get(k);
      if (j !== undefined) b[j].revenue += conv(Number(i.total), i.currency);
    }
    for (const e of expenses) {
      const k = e.expense_date.slice(0, 7);
      const j = idx.get(k);
      if (j !== undefined) b[j].expenses += conv(Number(e.amount), e.currency);
    }
    return b.map((x) => ({ ...x, cashflow: x.revenue - x.expenses }));
  }, [invoices, expenses, rates, currency]);

  // Real month-over-month deltas, derived from the same trend buckets shown in the chart
  // (not from live `stats`, which is all-time — this compares the two most recent months).
  const deltas = useMemo(() => {
    const n = trend.length;
    const thisMonth = trend[n - 1];
    const lastMonth = trend[n - 2];
    if (!thisMonth || !lastMonth) return { revenue: null, expenses: null, profit: null };
    const pct = (cur: number, prev: number) =>
      prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100;
    const thisProfit = thisMonth.revenue - thisMonth.expenses;
    const lastProfit = lastMonth.revenue - lastMonth.expenses;
    return {
      revenue: {
        pct: pct(thisMonth.revenue, lastMonth.revenue),
        up: thisMonth.revenue >= lastMonth.revenue,
      },
      expenses: {
        pct: pct(thisMonth.expenses, lastMonth.expenses),
        up: thisMonth.expenses <= lastMonth.expenses,
      },
      profit: { pct: pct(thisProfit, lastProfit), up: thisProfit >= lastProfit },
    };
  }, [trend]);

  function deltaLabel(d: { pct: number | null; up: boolean } | null) {
    if (!d || d.pct === null) return "";
    return `${d.pct >= 0 ? "+" : ""}${d.pct.toFixed(1)}%`;
  }

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const kpis = [
    {
      label: "Revenue",
      value: stats.revenue,
      icon: DollarSign,
      delta: deltaLabel(deltas.revenue),
      up: deltas.revenue?.up ?? true,
      tone: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Expenses",
      value: stats.expenses,
      icon: Receipt,
      delta: deltaLabel(deltas.expenses),
      up: deltas.expenses?.up ?? true,
      tone: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Profit",
      value: stats.profit,
      icon: TrendingUp,
      delta: deltaLabel(deltas.profit),
      up: deltas.profit?.up ?? true,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Cash balance",
      value: stats.cash,
      icon: Wallet,
      delta: "",
      up: true,
      tone: "text-violet-600",
      bg: "bg-violet-500/10",
    },
    {
      label: "Outstanding",
      value: stats.outstanding,
      icon: FileText,
      delta: "",
      up: true,
      tone: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Overdue bills",
      value: stats.overdue,
      icon: AlertTriangle,
      delta: "",
      up: false,
      tone: "text-rose-600",
      bg: "bg-rose-500/10",
    },
  ];

  const quickActions = [
    { label: "New invoice", to: "/invoices", icon: FileText },
    { label: "Add customer", to: "/customers", icon: UserPlus },
    { label: "Record expense", to: "/expenses", icon: Plus },
    { label: "Create bill", to: "/purchases/bills", icon: FileSpreadsheet },
    { label: "Add employee", to: "/hr/employees", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">
            Here's how your business is performing today.{" "}
            <span className="text-xs">
              All figures shown in <span className="font-medium">{currency}</span> at{" "}
              {fxLoading ? "loading" : "live"} FX rates.
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Button key={a.label} asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={a.to}>
                <a.icon className="h-4 w-4" /> {a.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {k.label}
              </span>
              <div className={`h-7 w-7 rounded-md flex items-center justify-center ${k.bg}`}>
                <k.icon className={`h-3.5 w-3.5 ${k.tone}`} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold">{loading ? "—" : fmt(k.value)}</div>
            {k.delta && (
              <div
                className={`mt-1 inline-flex items-center gap-1 text-xs ${k.up ? "text-emerald-600" : "text-rose-600"}`}
              >
                {k.up ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {k.delta} vs last month
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Revenue vs expenses</h2>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#rev)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(var(--destructive))"
                  fill="url(#exp)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-1">Cash flow</h2>
          <p className="text-xs text-muted-foreground mb-4">Net by month</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="cashflow" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Recent invoices</h2>
            <Link to="/invoices" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {invoices.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No invoices yet.{" "}
                <Link to="/invoices" className="text-primary hover:underline">
                  Create one →
                </Link>
              </div>
            )}
            {invoices.slice(0, 5).map((i) => (
              <div key={i.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-sm">{i.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.customer_id ? (customerMap.get(i.customer_id) ?? "—") : "No customer"} ·{" "}
                    {i.issue_date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{fmt(Number(i.total))}</div>
                  <div
                    className={`text-xs uppercase tracking-wide ${i.status === "paid" ? "text-emerald-600" : i.status === "overdue" ? "text-rose-600" : "text-muted-foreground"}`}
                  >
                    {i.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Recent expenses</h2>
            <Link to="/expenses" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {expenses.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No expenses yet.{" "}
                <Link to="/expenses" className="text-primary hover:underline">
                  Scan a receipt →
                </Link>
              </div>
            )}
            {expenses.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-sm">{e.vendor ?? "Unknown vendor"}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.category ?? "Uncategorized"} · {e.expense_date}
                  </div>
                </div>
                <div className="font-semibold text-sm">{fmt(Number(e.amount))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
