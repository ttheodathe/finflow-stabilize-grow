import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" /> Coming soon
        </Badge>
      </div>
      <p className="text-muted-foreground mb-8 max-w-2xl">{description}</p>
      {items && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it} className="rounded-xl border bg-card p-5">
              <div className="font-semibold">{it}</div>
              <div className="text-xs text-muted-foreground mt-1">In development</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
