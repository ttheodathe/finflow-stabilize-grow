import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleAlert, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { approveItemsDocument, rejectDocument } from "@/lib/document-ai.functions";
import { ValidationBanner, type ExtractionRow, type ValidationRow } from "@/components/document-review-workspace";

type Category = { id: string; name: string };

type DraftItem = {
  include: boolean;
  type: "product" | "service";
  name: string;
  price: string;
  cost: string;
  tax_rate: string;
  category_id: string;
};

export function ItemsBulkReviewWorkspace({
  open,
  documentId,
  fileUrl,
  mimeType,
  categories,
  defaultType,
  defaultCurrency,
  onClose,
  onApproved,
}: {
  open: boolean;
  documentId: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  categories: Category[];
  defaultType: "product" | "service";
  defaultCurrency: string;
  onClose: () => void;
  onApproved: (count: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [validations, setValidations] = useState<ValidationRow[]>([]);
  const [status, setStatus] = useState<string>("processing");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  const runApprove = useServerFn(approveItemsDocument);
  const runReject = useServerFn(rejectDocument);

  const includedCount = useMemo(() => drafts.filter((d) => d.include).length, [drafts]);

  async function load() {
    if (!documentId) return;
    setLoading(true);
    const [ext, val, doc] = await Promise.all([
      supabase.from("document_extractions").select("field_group,field_name,line_index,field_value,confidence").eq("document_id", documentId),
      supabase.from("document_validations").select("check_name,severity,message").eq("document_id", documentId),
      supabase.from("documents").select("status").eq("id", documentId).single(),
    ]);
    const rows = (ext.data ?? []) as ExtractionRow[];
    setValidations((val.data ?? []) as ValidationRow[]);
    setStatus(doc.data?.status ?? "processing");

    const lineIndices = Array.from(
      new Set(rows.filter((x) => x.field_group === "line_item").map((x) => x.line_index)),
    )
      .filter((i): i is number => i !== null)
      .sort((a, b) => a - b);

    if (lineIndices.length > 0) {
      setDrafts(
        lineIndices.map((idx) => {
          const get = (name: string) => rows.find((x) => x.field_group === "line_item" && x.line_index === idx && x.field_name === name)?.field_value;
          return {
            include: true,
            type: defaultType,
            name: get("product") ?? "",
            price: get("unit_price") ?? get("total") ?? "0",
            cost: "0",
            tax_rate: get("tax") ?? "0",
            category_id: "",
          };
        }).filter((d) => d.name.trim().length > 0),
      );
    } else {
      setDrafts([]);
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

  function updateDraft(i: number, patch: Partial<DraftItem>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function approve() {
    if (!documentId) return;
    const toCreate = drafts.filter((d) => d.include);
    if (toCreate.length === 0) return toast.error("Select at least one item to create");
    if (toCreate.some((d) => !d.name.trim())) return toast.error("Every selected item needs a name");
    setBusy(true);
    try {
      const res = await runApprove({
        data: {
          documentId,
          items: toCreate.map((d) => ({
            type: d.type,
            name: d.name.trim(),
            category_id: d.category_id || null,
            price: Number(d.price) || 0,
            cost: Number(d.cost) || 0,
            tax_rate: Number(d.tax_rate) || 0,
            currency: defaultCurrency,
          })),
        },
      });
      toast.success(`Created ${res.count} item${res.count > 1 ? "s" : ""}`);
      onApproved(res.count);
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
          <DialogTitle>Review price list — {drafts.length} item{drafts.length === 1 ? "" : "s"} detected</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 flex-1 min-h-0">
          <div className="border-r bg-muted/30 flex items-center justify-center p-4 overflow-auto">
            {fileUrl ? (
              mimeType?.startsWith("image/") ? (
                <img src={fileUrl} alt="Uploaded price list" className="max-w-full max-h-full object-contain rounded shadow" />
              ) : (
                <iframe src={fileUrl} title="Uploaded price list" className="w-full h-full rounded" />
              )
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="overflow-y-auto p-5 space-y-3">
            {(status === "processing" || status === "uploaded") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI is reading the document…
              </div>
            )}
            {status === "failed" && (
              <ValidationBanner v={{ check_name: "failed", severity: "error", message: "Extraction failed for this document." }} />
            )}
            {validations.map((v, i) => (
              <ValidationBanner key={i} v={v} />
            ))}
            {!loading && drafts.length === 0 && status !== "processing" && status !== "uploaded" && (
              <p className="text-sm text-muted-foreground">
                No line items were detected on this document — it may not be a price list/catalog format.
              </p>
            )}

            <div className="space-y-2">
              {drafts.map((d, i) => (
                <div key={i} className={`rounded border p-2 space-y-2 ${d.include ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={d.include} onCheckedChange={(c) => updateDraft(i, { include: !!c })} />
                    <Input
                      placeholder="Item name"
                      value={d.name}
                      onChange={(e) => updateDraft(i, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Select value={d.type} onValueChange={(v: "product" | "service") => updateDraft(i, { type: v })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pl-7">
                    <Input type="number" step="0.01" placeholder="Price" value={d.price} onChange={(e) => updateDraft(i, { price: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Cost" value={d.cost} onChange={(e) => updateDraft(i, { cost: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Tax %" value={d.tax_rate} onChange={(e) => updateDraft(i, { tax_rate: e.target.value })} />
                    <Select value={d.category_id} onValueChange={(v) => updateDraft(i, { category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
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
            <Button onClick={approve} disabled={busy || !!blockingError || loading || includedCount === 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Create {includedCount || ""} item{includedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
