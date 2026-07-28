import { createFileRoute, Link } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useTaxDashboard } from "@/hooks/useTaxDashboard";
import { useTaxDeadlines } from "@/hooks/useTaxDeadlines";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { TaxSummaryCards } from "@/components/tax/TaxSummaryCards";
import { UpcomingDeadlines } from "@/components/tax/UpcomingDeadlines";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tax/dashboard")({
  head: () => ({ meta: [{ title: "Tax — Free Accounting" }] }),
  component: TaxDashboardPage,
});

function TaxDashboardPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const currency = useDefaultCurrency();

  const { summary, isLoading } = useTaxDashboard(companyId);
  const { deadlines, isLoading: deadlinesLoading, completeDeadline } = useTaxDeadlines(companyId);

  if (!companyId) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tax</h1>
          <p className="text-sm text-muted-foreground">
            Track tax obligations, prepare returns, and stay ahead of deadlines.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/tax/settings">
              <Settings className="mr-2 h-4 w-4" />
              Tax settings
            </Link>
          </Button>
          <Button asChild>
            <Link to="/tax/returns">
              <FileText className="mr-2 h-4 w-4" />
              Filing history
            </Link>
          </Button>
        </div>
      </div>

      <TaxSummaryCards summary={summary} isLoading={isLoading} currency={currency} />

      <UpcomingDeadlines
        deadlines={deadlines}
        isLoading={deadlinesLoading}
        onComplete={(id) => completeDeadline({ id })}
      />
    </div>
  );
}
