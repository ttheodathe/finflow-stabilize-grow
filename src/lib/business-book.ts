export type CurrencyAmount = {
  currency?: string | null;
  amount?: number | string | null;
};

/**
 * Sum amounts independently by currency. Business Book must never add
 * different currencies together without an explicit exchange-rate conversion.
 */
export function sumByCurrency(rows: CurrencyAmount[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((totals, row) => {
    const currency = (row.currency || "USD").toUpperCase();
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount)) return totals;
    totals[currency] = (totals[currency] ?? 0) + amount;
    return totals;
  }, {});
}

export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatCurrencyTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals).filter(([, amount]) => amount !== 0);
  if (entries.length === 0) return "—";
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => {
      try {
        return new Intl.NumberFormat("en", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${currency} ${amount.toFixed(2)}`;
      }
    })
    .join(" · ");
}
