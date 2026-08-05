import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleAlert, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { approveEstimateDocument, rejectDocument } from "@/lib/document-ai.functions";
import {
  ConfidenceBadge,
  ValidationBanner,
  type ExtractionRow,
  type ValidationRow,
} from "@/components/document-review-workspace";

type Customer = { id: string; name: string };

type EstimateLine = {
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  confidence?: number;
};

const emptyLine: EstimateLine = { description: "", quantity: "1", unit_price: "0", tax_rate: "0" };

export function EstimateReviewWorkspace({
  open,
  documentId,
  fileUrl,
  mimeType,
  customers,
  defaultCurrency,
  onClose,
  onApproved,
}: {
  open: boolean;
  documentId: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  customers: Customer[];
  defaultCurrency: string;
  onClose: () => void;
  onApproved: (estimateId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [validations, setValidations] = useState<ValidationRow[]>([]);
  const [status, setStatus] = useState<string>("processing");
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const runApprove = useServerFn(approveEstimateDocument);
  const runReject = useServerFn(rejectDocument);

  const [header, setHeader] = useState({
    customer_id: "",
    estimate_number: "",
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    currency: defaultCurrency,
    notes: "",
  });
  const [lines, setLines] = useState<EstimateLine[]>([{ ...emptyLine }]);

  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const l of lines) {
      const amt = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
      sub += amt;
      tax += amt * ((Number(l.tax_rate) || 0) / 100);
    }
    return { subtotal: sub, tax, total: sub + tax };
  }, [lines]);

  async function load() {
    if (!documentId) return;
    setLoading(true);
    const [ext, val, doc] = await Promise.all([
      supabase.from("document_extractions").select("field_group,field_name,line_index,field_value,confidence").eq("document_id", documentId),
      supabase.from("document_validations").select("check_name,severity,message").eq("document_id", documentId),
      supabase.from("documents").select("status,overall_confidence").eq("id", documentId).single(),
    ]);
    const r = (ext.data ?? []) as ExtractionRow[];
    setValidations((val.data ?? []) as ValidationRow[]);
    setStatus(doc.data?.status ?? "processing");
    setOverallConfidence(doc.data?.overall_confidence ?? null);

    // A customer PO names the ORDERING company as "customer" (the field
    // our prompt calls "customer"), not "supplier" — that's the reverse of
    // bills, where the vendor is the sender.
    const customerName = r.find((x) => x.field_name === "customer")?.field_value ?? null;
    const matchedCustomer = customerName
      ? customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase())
      : null;
    const refNumber = r.find((x) => x.field_name === "reference_number")?.field_value
      ?? r.find((x) => x.field_name === "purchase_order")?.field_value;
    const currency = r.find((x) => x.field_name === "currency")?.field_value;
    const date = r.find((x) => x.field_name === "date")?.field_value;
    const dueDate = r.find((x) => x.field_name === "due_date")?.field_value;

    setHeader({
      customer_id: matchedCustomer?.id ?? "",
      estimate_number: refNumber || `EST-${Date.now().toString().slice(-6)}`,
      issue_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
      expiry_date: dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : "",
      currency: currency || defaultCurrency,
      notes: "",
    });

    const lineIndices = Array.from(
      new Set(r.filter((x) => x.field_group === "line_item").map((x) => x.line_index)),
    )
      .filter((i): i is number => i !== null)
      .sort((a, b) => a - b);

    if (lineIndices.length > 0) {
      setLines(
        lineIndices.map((idx) => {
          const get = (name: string) => r.find((x) => x.field_group === "line_item" && x.line_index === idx && x.field_name === name);
          const qty = get("quantity");
          const unitPrice = get("unit_price");
          return {
            description: get("product")?.field_value ?? "",
            quantity: qty?.field_value ?? "1",
            unit_price: unitPrice?.field_value ?? "0",
            tax_rate: get("tax")?.field_value ?? "0",
            confidence: Math.min(
              get("product")?.confidence ?? 1,
              qty?.confidence ?? 1,
              unitPrice?.confidence ?? 1,
            ),
          };
        }),
      );
    } else {
      setLines([{ ...emptyLine }]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open && documentId) load(); /* eslint-disable-next-line */
  }, [open, documentId]);

  // Bounded polling while the server extracts. The tick counter guarantees
  // the effect re-runs even when the status value is unchanged (otherwise
  // polling stopped after a single retry), fast at first for a snappy
  // result, and gives up after ~90s instead of spinning forever.
  const [pollTick, setPollTick] = useState(0);
  useEffect(() => {
    if (open) setPollTick(0); /* eslint-disable-next-line */
  }, [open, documentId]);
  useEffect(() => {
    if (!open || !documentId) return;
    if (status !== "processing" && status !== "uploaded") return;
    if (pollTick > 50) {
      setStatus("failed");
      return;
    }
    const t = setTimeout(() => {
      load();
      setPollTick((n) => n + 1);
    }, pollTick < 6 ? 700 : 2000); /* eslint-disable-next-line */
    return () => clearTimeout(t);
  }, [open, documentId, status, pollTick]);

  const blockingError = validations.find((v) => v.severity === "error");

  function updateLine(i: number, patch: Partial<EstimateLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function approve() {
    if (!documentId) return;
    if (!header.customer_id) return toast.error("Select a customer before approving");
    if (lines.some((l) => !l.description)) return toast.error("Every line needs a description");
    setBusy(true);
    try {
      const res = await runApprove({
        data: {
          documentId,
          estimate: {
            customer_id: header.customer_id,
            estimate_number: header.estimate_number,
            issue_date: header.issue_date,
            expiry_date: header.expiry_date || null,
            currency: header.currency,
            notes: header.notes || null,
            lines: lines.map((l) => ({
              description: l.description,
              quantity: Number(l.quantity) || 0,
              unit_price: Number(l.unit_price) || 0,
              tax_rate: Number(l.tax_rate) || 0,
            })),
          },
        },
      });
      toast.success("Document approved — draft estimate created");
      onApproved(res.estimateId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!documentId) return;
    setBusy(true);
    try {
      await runReject({ data: { documentId } });
      toast.success("Document rejected");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl h-[88vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Review customer order
            {overallConfidence !== null && (
              <span className="text-sm font-normal text-muted-foreground">
                — overall confidence {Math.round(overallConfidence * 100)}%
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 flex-1 min-h-0">
          <div className="border-r bg-muted/30 flex items-center justify-center p-4 overflow-auto">
            {fileUrl ? (
              mimeType?.startsWith("image/") ? (
                <img src={fileUrl} alt="Uploaded customer order" className="max-w-full max-h-full object-contain rounded shadow" />
              ) : (
                <iframe src={fileUrl} title="Uploaded customer order" className="w-full h-full rounded" />
              )
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="overflow-y-auto p-5 space-y-5">
            {(status === "processing" || status === "uploaded") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI is reading the document…
              </div>
            )}
            {status === "failed" && (
              <ValidationBanner v={{ check_name: "failed", severity: "error", message: "Extraction failed for this document. You can still enter the details manually below." }} />
            )}
            {validations.length > 0 && (
              <div className="space-y-2">
                {validations.map((v, i) => (
                  <ValidationBanner key={i} v={v} />
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Estimate details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Customer</Label>
                  <Select value={header.customer_id} onValueChange={(v) => setHeader((h) => ({ ...h, customer_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Estimate number</Label>
                  <Input value={header.estimate_number} onChange={(e) => setHeader((h) => ({ ...h, estimate_number: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Input value={header.currency} onChange={(e) => setHeader((h) => ({ ...h, currency: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Issue date</Label>
                  <Input type="date" value={header.issue_date} onChange={(e) => setHeader((h) => ({ ...h, issue_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Expiry date</Label>
                  <Input type="date" value={header.expiry_date} onChange={(e) => setHeader((h) => ({ ...h, expiry_date: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={header.notes} onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))} rows={2} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Line items</h4>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3 w-3" /> Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="rounded border p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Description"
                        value={l.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        className="flex-1"
                      />
                      {l.confidence !== undefined && <ConfidenceBadge confidence={l.confidence} />}
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" step="0.01" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Unit price" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Tax %" value={l.tax_rate} onChange={(e) => updateLine(i, { tax_rate: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-right text-muted-foreground pt-1">
                Subtotal {totals.subtotal.toFixed(2)} · Tax {totals.tax.toFixed(2)} ·{" "}
                <span className="font-medium text-foreground">Total {totals.total.toFixed(2)} {header.currency}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t bg-background">
          <Button variant="ghost" onClick={reject} disabled={busy}>Reject document</Button>
          <div className="flex items-center gap-2">
            {blockingError && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <CircleAlert className="h-3.5 w-3.5" /> Resolve the error above first
              </span>
            )}
            <Button onClick={approve} disabled={busy || !!blockingError || loading}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Approve & create estimate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
