import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currencies";
import type { TaxReturn, TaxReturnStatus } from "@/types/tax.types";

const STATUS_STYLE: Record<TaxReturnStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  in_review: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  submitted: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
};

export function TaxReturnsTable({
  returns,
  isLoading,
  currency = "USD",
}: {
  returns: TaxReturn[];
  isLoading: boolean;
  currency?: string;
}) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (returns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No tax returns yet. Create one from a tax period to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Net tax due</TableHead>
          <TableHead className="text-right">Due date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {returns.map((r) => (
          <TableRow key={r.id} className="cursor-pointer">
            <TableCell>
              <Link
                to="/tax/returns/$returnId"
                params={{ returnId: r.id }}
                className="font-medium hover:underline"
              >
                {r.tax_period
                  ? `${new Date(r.tax_period.period_start).toLocaleDateString()} – ${new Date(
                      r.tax_period.period_end,
                    ).toLocaleDateString()}`
                  : "—"}
              </Link>
            </TableCell>
            <TableCell className="capitalize">{r.tax_type}</TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUS_STYLE[r.status]}>
                {r.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(r.net_tax_due, currency)}</TableCell>
            <TableCell className="text-right text-muted-foreground">
              {r.tax_period ? new Date(r.tax_period.due_date).toLocaleDateString() : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
