import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ArrowLeftRight, ClipboardEdit } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useAccounts } from "@/hooks/useAccounts";
import { useStockMovements } from "@/hooks/useStockMovements";
import type { AdjustmentReason, StockMovement } from "@/types/inventory.types";

export const Route = createFileRoute("/_authenticated/items/stock-movements")({
  head: () => ({ meta: [{ title: "Stock movements — Finflow Track" }] }),
  component: StockMovementsPage,
});

type ItemOpt = { id: string; name: string };
type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

const REASON_LABEL: Record<string, string> = {
  invoice_paid: "Sale",
  invoice_reversed: "Payment reversed",
  invoice_deleted: "Paid invoice deleted",
  receipt: "Received",
  dispatch: "Dispatched",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
  cycle_count: "Cycle count",
  damaged: "Damaged",
  lost: "Lost",
  found: "Found",
  correction: "Correction",
  return_in: "Return (in)",
  return_out: "Return (out)",
};

function reasonVariant(r: string): "default" | "secondary" | "destructive" {
  if (["invoice_paid", "receipt", "transfer_in", "found"].includes(r)) return "default";
  if (["transfer_out", "cycle_count", "correction", "invoice_reversed"].includes(r))
    return "secondary";
  return "destructive";
}

const ADJUSTMENT_REASONS: { value: AdjustmentReason; label: string }[] = [
  { value: "cycle_count", label: "Cycle count" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
  { value: "correction", label: "Correction" },
];

function StockMovementsPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const [items, setItems] = useState<ItemOpt[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [itemFilter, setItemFilter] = useState<string>("all");

  const { warehouses } = useWarehouses(companyId);
  const { movements, isLoading, transferStock, adjustStock, isTransferring, isAdjusting } =
    useStockMovements(companyId, { itemId: itemFilter === "all" ? undefined : itemFilter });

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("items")
      .select("id,name")
      .eq("company_id", companyId)
      .eq("type", "product")
      .eq("track_inventory", true)
      .order("name")
      .then(({ data }) => setItems((data ?? []) as ItemOpt[]));
  }, [companyId]);

  useEffect(() => {
    const userIds = Array.from(new Set(movements.map((m) => m.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      setProfiles({});
      return;
    }
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)
      .then(({ data }) => {
        const map: ProfileMap = {};
        for (const p of data ?? []) map[p.id] = { full_name: p.full_name, email: p.email };
        setProfiles(map);
      });
  }, [movements]);

  function exportCsv() {
    if (movements.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = [
      "Changed at",
      "Changed by",
      "Changed by email",
      "Product",
      "SKU",
      "Warehouse",
      "Reason",
      "Reference",
      "Note",
      "Change",
      "Balance after",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const m of movements) {
      const p = profiles[m.user_id];
      lines.push(
        [
          new Date(m.created_at).toISOString(),
          p?.full_name ?? "",
          p?.email ?? "",
          m.items?.name ?? "",
          "",
          m.warehouses?.name ?? "",
          REASON_LABEL[m.reason] ?? m.reason,
          m.invoices?.invoice_number ?? "",
          m.note ?? "",
          Number(m.quantity_change),
          m.balance_after ?? "",
        ]
          .map(esc)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix =
      itemFilter === "all"
        ? "all"
        : (items.find((i) => i.id === itemFilter)?.name ?? "filtered")
            .replace(/[^a-z0-9]+/gi, "-")
            .toLowerCase();
    a.href = url;
    a.download = `stock-movements-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Stock movements</h1>
          <p className="text-muted-foreground">
            The full inventory ledger — sales, receipts, transfers, and adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tracked products</SelectItem>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            <ClipboardEdit className="h-4 w-4" /> Adjust
          </Button>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={isLoading || movements.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No stock movements yet. They'll appear here from sales, receiving, transfers, and
            adjustments.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Balance after</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m: StockMovement) => {
                const positive = Number(m.quantity_change) > 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{m.items?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{m.warehouses?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={reasonVariant(m.reason)}>
                        {REASON_LABEL[m.reason] ?? m.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.invoices?.invoice_number ?? m.note ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {positive ? "+" : ""}
                      {Number(m.quantity_change)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.balance_after ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        companyId={companyId}
        items={items}
        warehouses={warehouses}
        onTransfer={transferStock}
        isSubmitting={isTransferring}
      />
      <AdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        companyId={companyId}
        items={items}
        warehouses={warehouses}
        onAdjust={adjustStock}
        isSubmitting={isAdjusting}
      />
    </div>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  companyId,
  items,
  warehouses,
  onTransfer,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  items: ItemOpt[];
  warehouses: { id: string; name: string }[];
  onTransfer: ReturnType<typeof useStockMovements>["transferStock"];
  isSubmitting: boolean;
}) {
  const [itemId, setItemId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  async function handleSubmit() {
    if (!itemId || !fromWarehouseId || !toWarehouseId) {
      toast.error("Select a product, source, and destination warehouse");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("Source and destination must differ");
      return;
    }
    try {
      await onTransfer({
        companyId,
        itemId,
        fromWarehouseId,
        toWarehouseId,
        quantity: Number(quantity) || 0,
        note: note || null,
      });
      toast.success("Stock transferred");
      onOpenChange(false);
      setQuantity("1");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button
            className="w-full bg-gradient-hero"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Transferring…" : "Transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({
  open,
  onOpenChange,
  companyId,
  items,
  warehouses,
  onAdjust,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  items: ItemOpt[];
  warehouses: { id: string; name: string }[];
  onAdjust: ReturnType<typeof useStockMovements>["adjustStock"];
  isSubmitting: boolean;
}) {
  const { accounts } = useAccounts(companyId);
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("cycle_count");
  const [direction, setDirection] = useState<"increase" | "decrease">("decrease");
  const [quantity, setQuantity] = useState("1");
  const [offsetAccountId, setOffsetAccountId] = useState<string>("");
  const [note, setNote] = useState("");

  async function handleSubmit() {
    if (!itemId || !warehouseId) {
      toast.error("Select a product and warehouse");
      return;
    }
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      toast.error("Quantity must be positive");
      return;
    }
    try {
      await onAdjust({
        companyId,
        itemId,
        warehouseId,
        quantityDelta: direction === "increase" ? qty : -qty,
        reason,
        offsetAccountId: offsetAccountId || null,
        note: note || null,
      });
      toast.success("Adjustment recorded");
      onOpenChange(false);
      setQuantity("1");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record adjustment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as AdjustmentReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decrease">−</SelectItem>
                  <SelectItem value="increase">+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label>Offset account (optional — posts the GL impact)</Label>
            <Select value={offsetAccountId} onValueChange={setOffsetAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="No accounting entry" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button
            className="w-full bg-gradient-hero"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Saving…" : "Record adjustment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
