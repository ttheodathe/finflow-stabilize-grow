import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleAlert, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { approveBillDocument, rejectDocument } from "@/lib/document-ai.functions";
import {
  ConfidenceBadge,
  ValidationBanner,
  type ExtractionRow,
  type ValidationRow,
} from "@/components/document-review-workspace";

type Vendor = { id: string; name: string };
type Account = { id: string; code: string; name: string };

type BillLine = {
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  account_id: string;
  confidence?: number;
};

const emptyLine: BillLine = { description: "", quantity: "1", unit_price: "0", tax_rate: "0", account_id: "" };

export function BillReviewWorkspace({
  open,
  documentId,
  fileUrl,
  mimeType,
  vendors,
  expenseAccounts,
  defaultCurrency,
  onClose,
  onApproved,
}: {
  open: boolean;
  documentId: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  vendors: Vendor[];
  expenseAccounts: Account[];
  defaultCurrency: string;
  onClose: () => void;
  onApproved: (billId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  const [validations, setValidations] = useState<ValidationRow[]>([]);
  const [status, setStatus] = useState<string>("processing");
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const runApprove = useServerFn(approveBillDocument);
  const runReject = useServerFn(rejectDocument);

  const [header, setHeader] = useState({
    vendor_id: "",
    bill_number: "",
    reference: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    currency: defaultCurrency,
  });
  const [lines, setLines] = useState<BillLine[]>([{ ...emptyLine }]);

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
    setRows(r);
    setValidations((val.data ?? []) as ValidationRow[]);
    setStatus(doc.data?.status ?? "processing");
    setOverallConfidence(doc.data?.overall_confidence ?? null);

    const supplierName = r.find((x) => x.field_name === "supplier")?.field_value
      ?? r.find((x) => x.field_name === "company")?.field_value
      ?? null;
    const matchedVendor = supplierName
      ? vendors.find((v) => v.name.toLowerCase() === supplierName.toLowerCase())
      : null;
    const invoiceNumber = r.find((x) => x.field_name === "invoice_number")?.field_value;
    const currency = r.find((x) => x.field_name === "currency")?.field_value;
    const date = r.find((x) => x.field_name === "date")?.field_value;
    const dueDate = r.find((x) => x.field_name === "due_date")?.field_value;

    setHeader({
      vendor_id: matchedVendor?.id ?? "",
      bill_number: invoiceNumber || `BILL-${Date.now().toString().slice(-6)}`,
      reference: r.find((x) => x.field_name === "reference_number")?.field_value ?? "",
      issue_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
      due_date: dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : "",
      currency: currency || defaultCurrency,
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
          const tax = get("tax");
          return {
            description: get("product")?.field_value ?? "",
            quantity: qty?.field_value ?? "1",
            unit_price: unitPrice?.field_value ?? "0",
            tax_rate: tax?.field_value ?? "0",
            account_id: "",
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

  useEffect(() => {
    if (!open || !documentId) return;
    if (status !== "processing" && status !== "uploaded") return;
    const t = setTimeout(load, 1500); /* eslint-disable-next-line */
    return () => clearTimeout(t);
  }, [open, documentId, status]);

  const blockingError = validations.find((v) => v.severity === "error");

  function updateLine(i: number, patch: Partial<BillLine>) {
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
    if (!header.vendor_id) return toast.error("Select a vendor before approving");
    if (lines.some((l) => !l.description || !l.account_id))
      return toast.error("Every line needs a description and an expense account");
    setBusy(true);
    try {
      const res = await runApprove({
        data: {
          documentId,
          bill: {
            vendor_id: header.vendor_id,
            bill_number: header.bill_number,
            reference: header.reference || null,
            issue_date: header.issue_date,
            due_date: header.due_date || null,
            currency: header.currency,
            lines: lines.map((l) => ({
              description: l.description,
              quantity: Number(l.quantity) || 0,
              unit_price: Number(l.unit_price) || 0,
              tax_rate: Number(l.tax_rate) || 0,
              account_id: l.account_id,
            })),
          },
        },
      });
      toast.success("Document approved — bill created and posted to the ledger");
      onApproved(res.billId);
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
            Review bill
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
                <img src={fileUrl} alt="Uploaded bill" className="max-w-full max-h-full object-contain rounded shadow" />
              ) : (
                <iframe src={fileUrl} title="Uploaded bill" className="w-full h-full rounded" />
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
              <h4 className="text-sm font-medium text-muted-foreground">Bill details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Vendor</Label>
                  <Select value={header.vendor_id} onValueChange={(v) => setHeader((h) => ({ ...h, vendor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Bill number</Label>
                  <Input value={header.bill_number} onChange={(e) => setHeader((h) => ({ ...h, bill_number: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Reference</Label>
                  <Input value={header.reference} onChange={(e) => setHeader((h) => ({ ...h, reference: e.target.value }))} />
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
                  <Label>Due date</Label>
                  <Input type="date" value={header.due_date} onChange={(e) => setHeader((h) => ({ ...h, due_date: e.target.value }))} />
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
                    <div className="grid grid-cols-4 gap-2">
                      <Input type="number" step="0.01" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Unit price" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Tax %" value={l.tax_rate} onChange={(e) => updateLine(i, { tax_rate: e.target.value })} />
                      <Select value={l.account_id} onValueChange={(v) => updateLine(i, { account_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                        <SelectContent>
                          {expenseAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              Approve & create bill
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
