import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CircleAlert, Info, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { approveDocument, rejectDocument } from "@/lib/document-ai.functions";

export type ExtractionRow = {
  field_group: string;
  field_name: string;
  line_index: number | null;
  field_value: string | null;
  confidence: number;
};

export type ValidationRow = {
  check_name: string;
  severity: "info" | "warning" | "error";
  message: string;
};

type Vendor = { id: string; name: string };
type Account = { id: string; code: string; name: string };

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant: "default" | "secondary" | "destructive" =
    confidence >= 0.8 ? "default" : confidence >= 0.6 ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0 font-normal">
      {pct}%
    </Badge>
  );
}

export function ValidationBanner({ v }: { v: ValidationRow }) {
  const Icon = v.severity === "error" ? CircleAlert : v.severity === "warning" ? AlertTriangle : Info;
  const color =
    v.severity === "error"
      ? "text-destructive bg-destructive/10 border-destructive/30"
      : v.severity === "warning"
        ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
        : "text-muted-foreground bg-muted border-border";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${color}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{v.message}</span>
    </div>
  );
}

export function DocumentReviewWorkspace({
  open,
  documentId,
  fileUrl,
  mimeType,
  vendors,
  accounts,
  defaultCurrency,
  onClose,
  onApproved,
}: {
  open: boolean;
  documentId: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  vendors: Vendor[];
  accounts: Account[];
  defaultCurrency: string;
  onClose: () => void;
  onApproved: (expenseId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  const [validations, setValidations] = useState<ValidationRow[]>([]);
  const [status, setStatus] = useState<string>("processing");
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const runApprove = useServerFn(approveDocument);
  const runReject = useServerFn(rejectDocument);

  const field = (group: string, name: string) =>
    rows.find((r) => r.field_group === group && r.field_name === name) ?? null;

  const [form, setForm] = useState({
    vendor_id: "",
    account_id: "",
    description: "",
    amount: "0",
    expense_date: new Date().toISOString().slice(0, 10),
    currency: defaultCurrency,
    supplier_invoice_number: "",
  });

  const lineItems = useMemo(() => {
    const indices = Array.from(new Set(rows.filter((r) => r.field_group === "line_item").map((r) => r.line_index)))
      .filter((i): i is number => i !== null)
      .sort((a, b) => a - b);
    return indices.map((idx) => {
      const get = (name: string) => rows.find((r) => r.field_group === "line_item" && r.line_index === idx && r.field_name === name);
      return {
        idx,
        product: get("product"),
        quantity: get("quantity"),
        unit_price: get("unit_price"),
        tax: get("tax"),
        total: get("total"),
      };
    });
  }, [rows]);

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

    // Pre-fill the editable expense form from extracted fields, matching
    // vendor/account by name where possible (same matching used by the
    // legacy single-shot scanner).
    const supplierName = r.find((x) => x.field_name === "supplier")?.field_value
      ?? r.find((x) => x.field_name === "company")?.field_value
      ?? null;
    const matchedVendor = supplierName
      ? vendors.find((v) => v.name.toLowerCase() === supplierName.toLowerCase())
      : null;
    const total = r.find((x) => x.field_group === "financial" && x.field_name === "grand_total")?.field_value;
    const currency = r.find((x) => x.field_name === "currency")?.field_value;
    const date = r.find((x) => x.field_name === "date")?.field_value;
    const invoiceNumber = r.find((x) => x.field_name === "invoice_number")?.field_value;

    setForm({
      vendor_id: matchedVendor?.id ?? "",
      account_id: "",
      description: supplierName ? `Document from ${supplierName}` : "",
      amount: total ?? "0",
      expense_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
      currency: currency || defaultCurrency,
      supplier_invoice_number: invoiceNumber ?? "",
    });
    setLoading(false);
  }

  useEffect(() => {
    if (open && documentId) load(); /* eslint-disable-next-line */
  }, [open, documentId]);

  // Poll briefly while the document is still being extracted server-side.
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

  async function approve() {
    if (!documentId) return;
    if (!form.vendor_id) return toast.error("Select a vendor before approving");
    if (!form.account_id) return toast.error("Select an account/category before approving");
    setBusy(true);
    try {
      const res = await runApprove({
        data: {
          documentId,
          expense: {
            vendor_id: form.vendor_id,
            account_id: form.account_id,
            description: form.description,
            amount: Number(form.amount) || 0,
            expense_date: form.expense_date,
            currency: form.currency,
            supplier_invoice_number: form.supplier_invoice_number || null,
          },
        },
      });
      toast.success("Document approved — expense created");
      onApproved(res.expenseId);
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
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Review document
            {overallConfidence !== null && (
              <span className="text-sm font-normal text-muted-foreground">
                — overall confidence {Math.round(overallConfidence * 100)}%
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 flex-1 min-h-0">
          {/* Left: original document */}
          <div className="border-r bg-muted/30 flex items-center justify-center p-4 overflow-auto">
            {fileUrl ? (
              mimeType?.startsWith("image/") ? (
                <img src={fileUrl} alt="Uploaded document" className="max-w-full max-h-full object-contain rounded shadow" />
              ) : (
                <iframe src={fileUrl} title="Uploaded document" className="w-full h-full rounded" />
              )
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Right: extracted fields + validation + approval form */}
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

            {!loading && rows.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Extracted fields</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {rows
                    .filter((r) => r.field_group !== "line_item" && r.field_value !== null)
                    .map((r) => (
                      <div key={`${r.field_group}-${r.field_name}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {r.field_name.replace(/_/g, " ")}
                          </div>
                          <div className="truncate font-medium">{r.field_value}</div>
                        </div>
                        <ConfidenceBadge confidence={r.confidence} />
                      </div>
                    ))}
                </div>

                {lineItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">Line items</h4>
                    <div className="space-y-1.5">
                      {lineItems.map((li) => (
                        <div key={li.idx} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm">
                          <span className="truncate">{li.product?.field_value ?? "—"}</span>
                          <span className="text-muted-foreground shrink-0">
                            {li.quantity?.field_value ?? "?"} × {li.unit_price?.field_value ?? "?"} = {li.total?.field_value ?? "?"}
                          </span>
                          {li.total && <ConfidenceBadge confidence={li.total.confidence} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Confirm & post as expense</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Vendor</Label>
                  <Select value={form.vendor_id} onValueChange={(v) => setForm((f) => ({ ...f, vendor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm((f) => ({ ...f, account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Invoice / reference #</Label>
                  <Input value={form.supplier_invoice_number} onChange={(e) => setForm((f) => ({ ...f, supplier_invoice_number: e.target.value }))} />
                </div>
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
            <Button onClick={approve} disabled={busy || !!blockingError}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Approve & create expense
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
