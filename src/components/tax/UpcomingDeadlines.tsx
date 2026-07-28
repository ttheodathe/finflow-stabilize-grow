import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import type { TaxDeadline, TaxDeadlineStatus } from "@/types/tax.types";

const STATUS_STYLE: Record<TaxDeadlineStatus, string> = {
  upcoming: "bg-secondary text-secondary-foreground",
  due_soon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  overdue: "bg-destructive/15 text-destructive",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const STATUS_LABEL: Record<TaxDeadlineStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  overdue: "Overdue",
  completed: "Completed",
};

export function UpcomingDeadlines({
  deadlines,
  isLoading,
  onComplete,
}: {
  deadlines: TaxDeadline[];
  isLoading: boolean;
  onComplete?: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming deadlines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        )}

        {!isLoading && deadlines.length === 0 && (
          <p className="text-sm text-muted-foreground">No tax deadlines set up yet.</p>
        )}

        {!isLoading &&
          deadlines.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  Due {new Date(d.due_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLE[d.status]}>
                  {STATUS_LABEL[d.status]}
                </Badge>
                {onComplete && d.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => onComplete(d.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Mark complete"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
