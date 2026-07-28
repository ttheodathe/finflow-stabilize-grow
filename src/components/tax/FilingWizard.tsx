import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currencies";
import type { TaxReturn, TaxReturnLine } from "@/types/tax.types";

export function FilingWizard({
  taxReturn,
  lines,
  currency = "USD",
  canFile,
  onSubmit,
}: {
  taxReturn: TaxReturn;
  lines: TaxReturnLine[];
  currency?: string;
  canFile: boolean;
  onSubmit: (referenceNumber?: string) => Promise<unknown>;
}) {
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const outputLines = lines.filter((l) => l.direction === "output");
  const inputLines = lines.filter((l) => l.direction === "input");

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(reference || undefined);
      toast.success("Tax return submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit return");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Output tax (sales)"
          value={formatCurrency(taxReturn.output_tax, currency)}
        />
        <SummaryStat
          label="Input tax (purchases)"
          value={formatCurrency(taxReturn.input_tax, currency)}
        />
        <SummaryStat
          label="Net tax due"
          value={formatCurrency(taxReturn.net_tax_due, currency)}
          emphasize
        />
      </div>

      <LineTable
        title={`Sales / output tax (${outputLines.length})`}
        lines={outputLines}
        currency={currency}
      />
      <LineTable
        title={`Purchases / input tax (${inputLines.length})`}
        lines={inputLines}
        currency={currency}
      />

      {taxReturn.status === "draft" && canFile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit this return</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Authority reference number (optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. filing confirmation number"
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Mark as submitted"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This records the filing in FinFlowTrack. If your jurisdiction supports e-filing
              integration, submit through their portal first, then record the confirmation here.
            </p>
          </CardContent>
        </Card>
      )}

      {taxReturn.status !== "draft" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{taxReturn.status.replace("_", " ")}</Badge>
          {taxReturn.submitted_at && (
            <span>Submitted {new Date(taxReturn.submitted_at).toLocaleString()}</span>
          )}
          {taxReturn.reference_number && <span>· Ref: {taxReturn.reference_number}</span>}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={emphasize ? "text-2xl font-bold" : "text-xl font-semibold"}>{value}</p>
      </CardContent>
    </Card>
  );
}

function LineTable({
  title,
  lines,
  currency,
}: {
  title: string;
  lines: TaxReturnLine[];
  currency: string;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No line items in this category.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Taxable amount</TableHead>
              <TableHead className="text-right">Tax amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.description ?? "—"}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{l.source_type}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(l.taxable_amount, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(l.tax_amount, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
