import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useAccounts } from "@/hooks/useAccounts";
import { receiveStock } from "@/services/inventory/stockMovements.service";

interface POLine {
  id: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
}

export function ReceivePODialog({
  open,
  onOpenChange,
  companyId,
  poId,
  poNumber,
  onReceived,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  poId: string;
  poNumber: string;
  onReceived: () => void;
}) {
  const { warehouses, defaultWarehouse } = useWarehouses(companyId);
  const { accounts } = useAccounts(companyId);

  const [lines, setLines] = useState<POLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(true);
  const [warehouseId, setWarehouseId] = useState("");
  const [offsetAccountId, setOffsetAccountId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const payableAccount = useMemo(
    () => accounts.find((a) => a.type === "liability" && /payable/i.test(a.name)) ?? null,
    [accounts],
  );

  useEffect(() => {
    if (!open) return;
    setLoadingLines(true);
    supabase
      .from("purchase_order_items")
      .select("id, item_id, description, quantity, unit_price, received_quantity")
      .eq("po_id", poId)
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
          setLoadingLines(false);
          return;
        }
        const rows = (data ?? []) as POLine[];
        setLines(rows);
        const initial: Record<string, string> = {};
        for (const l of rows) {
          const remaining = Math.max(Number(l.quantity) - Number(l.received_quantity ?? 0), 0);
          initial[l.id] = String(remaining);
        }
        setQuantities(initial);
        setLoadingLines(false);
      });
  }, [open, poId]);

  useEffect(() => {
    if (defaultWarehouse && !warehouseId) setWarehouseId(defaultWarehouse.id);
  }, [defaultWarehouse, warehouseId]);

  useEffect(() => {
    if (payableAccount && !offsetAccountId) setOffsetAccountId(payableAccount.id);
  }, [payableAccount, offsetAccountId]);

  async function handleSubmit() {
    if (!warehouseId) {
      toast.error("Select a warehouse to receive into");
      return;
    }
    const toReceive = lines.filter((l) => l.item_id && Number(quantities[l.id]) > 0);
    if (toReceive.length === 0) {
      toast.error("Nothing to receive");
      return;
    }
    setSubmitting(true);
    try {
      for (const line of toReceive) {
        await receiveStock({
          companyId,
          itemId: line.item_id as string,
          warehouseId,
          quantity: Number(quantities[line.id]),
          unitCost: Number(line.unit_price) || 0,
          offsetAccountId: offsetAccountId || null,
          note: `PO ${poNumber}`,
          poItemId: line.id,
        });
      }
      toast.success(`Received ${toReceive.length} line${toReceive.length > 1 ? "s" : ""}`);
      onOpenChange(false);
      onReceived();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to receive stock");
    } finally {
      setSubmitting(false);
    }
  }

  const unlinkedCount = lines.filter((l) => !l.item_id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive stock — {poNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Receive into</Label>
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
            <div>
              <Label>Offset account (credit)</Label>
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
          </div>

          {loadingLines ? (
            <p className="text-sm text-muted-foreground">Loading PO lines…</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">This PO has no lines.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received so far</TableHead>
                  <TableHead className="text-right w-28">Receive now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.description}
                      {!l.item_id && (
                        <span className="text-xs text-muted-foreground block">
                          Not linked to a catalog product — can't track stock for this line
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {l.received_quantity ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        disabled={!l.item_id}
                        className="w-24 ml-auto text-right"
                        value={quantities[l.id] ?? "0"}
                        onChange={(e) => setQuantities({ ...quantities, [l.id]: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {unlinkedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unlinkedCount} line{unlinkedCount > 1 ? "s" : ""} on this PO aren't linked to a
              catalog product, so they can't be received into inventory.
            </p>
          )}

          <Button className="w-full bg-gradient-hero" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Receiving…" : "Receive stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
