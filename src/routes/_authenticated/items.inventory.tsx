import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useInventoryBalances } from "@/hooks/useInventoryBalances";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Warehouse as WarehouseIcon, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/items/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Finflow Track" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const { warehouses, isLoading: warehousesLoading } = useWarehouses(companyId);

  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { balances, isLoading: balancesLoading } = useInventoryBalances(
    companyId,
    warehouseFilter === "all" ? undefined : warehouseFilter,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return balances.filter((b) => {
      if (!b.items?.track_inventory) return false;
      if (!q) return true;
      return (
        b.items?.name.toLowerCase().includes(q) ||
        b.items?.sku?.toLowerCase().includes(q) ||
        b.items?.barcode?.toLowerCase().includes(q)
      );
    });
  }, [balances, search]);

  const totals = useMemo(() => {
    const onHand = filtered.reduce((sum, b) => sum + Number(b.quantity_on_hand), 0);
    const lowStock = filtered.filter(
      (b) =>
        b.items &&
        Number(b.quantity_available) <= Number(b.items.reorder_level) &&
        Number(b.items.reorder_level) > 0,
    ).length;
    const outOfStock = filtered.filter((b) => Number(b.quantity_available) <= 0).length;
    return { onHand, lowStock, outOfStock, skus: new Set(filtered.map((b) => b.item_id)).size };
  }, [filtered]);

  const isLoading = warehousesLoading || balancesLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Real-time stock levels across every warehouse.</p>
        </div>
        <Link to="/items/warehouses">
          <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
            <WarehouseIcon className="h-3 w-3" /> Manage warehouses
          </Badge>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Tracked SKUs" value={totals.skus} />
        <StatCard label="Units on hand" value={totals.onHand.toLocaleString()} />
        <StatCard
          label="Low stock"
          value={totals.lowStock}
          tone={totals.lowStock > 0 ? "warn" : undefined}
        />
        <StatCard
          label="Out of stock"
          value={totals.outOfStock}
          tone={totals.outOfStock > 0 ? "bad" : undefined}
        />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search by name, SKU, or barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-xl">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No tracked inventory yet. Enable "Track inventory" on a product to see it here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Incoming</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const reorderLevel = b.items?.reorder_level ?? 0;
                const isOut = Number(b.quantity_available) <= 0;
                const isLow =
                  !isOut && reorderLevel > 0 && Number(b.quantity_available) <= reorderLevel;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.items?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{b.items?.sku ?? "—"}</TableCell>
                    <TableCell>{b.warehouses?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(b.quantity_on_hand)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(b.quantity_reserved)}
                    </TableCell>
                    <TableCell className="text-right">{Number(b.quantity_available)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(b.quantity_incoming)}
                    </TableCell>
                    <TableCell>
                      {isOut && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Out of stock
                        </Badge>
                      )}
                      {isLow && (
                        <Badge variant="secondary" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Low stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "warn" | "bad";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-2xl font-bold mt-1 ${
          tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
