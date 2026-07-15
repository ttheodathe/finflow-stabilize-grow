import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Free Accounting" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const [data, setData] = useState({
    revenue: 0,
    expenses: 0,
    paid: 0,
    outstanding: 0,
    invoiceCount: 0,
    expenseCount: 0,
  });

  useEffect(() => {
    (async () => {
      const [inv, exp] = await Promise.all([
        supabase.from("invoices").select("total,status"),
        supabase.from("expenses").select("amount"),
      ]);
      const invoices = inv.data ?? [];
      const expenses = exp.data ?? [];
      const paid = invoices
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + Number(i.total), 0);
      const outstanding = invoices
        .filter((i) => i.status !== "paid" && i.status !== "draft")
        .reduce((s, i) => s + Number(i.total), 0);
      const revenue = paid;
      const expTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
      setData({
        revenue,
        expenses: expTotal,
        paid,
        outstanding,
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
      });
    })();
  }, []);

  const profit = data.revenue - data.expenses;
  const rows = [
    ["Revenue (paid invoices)", fmt(data.revenue)],
    ["Total expenses", fmt(data.expenses)],
    ["Net profit", fmt(profit)],
    ["Outstanding invoices", fmt(data.outstanding)],
    ["Total invoices", String(data.invoiceCount)],
    ["Total expense entries", String(data.expenseCount)],
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Reports</h1>
      <p className="text-muted-foreground mb-8">Profit & loss overview.</p>
      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b last:border-0">
                <td className="px-6 py-4 text-sm text-muted-foreground">{label}</td>
                <td className="px-6 py-4 text-right font-semibold">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
