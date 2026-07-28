import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, Landmark, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/currencies";
import type { TaxDashboardSummary } from "@/types/tax.types";

export function TaxSummaryCards({
  summary,
  isLoading,
  currency = "USD",
}: {
  summary: TaxDashboardSummary | undefined;
  isLoading: boolean;
  currency?: string;
}) {
  const cards = [
    {
      label: "Net tax due",
      value: summary ? formatCurrency(summary.netTaxDueThisPeriod, currency) : "—",
      icon: Landmark,
      tone: "text-foreground",
    },
    {
      label: "Open returns",
      value: summary?.openReturns ?? "—",
      icon: FileText,
      tone: "text-foreground",
    },
    {
      label: "Next deadline",
      value: summary?.nextDeadline
        ? new Date(summary.nextDeadline.due_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "None set",
      icon: CalendarClock,
      tone: "text-foreground",
    },
    {
      label: "Overdue",
      value: summary?.overdueCount ?? 0,
      icon: AlertTriangle,
      tone: (summary?.overdueCount ?? 0) > 0 ? "text-destructive" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className={`text-2xl font-semibold ${card.tone}`}>{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
