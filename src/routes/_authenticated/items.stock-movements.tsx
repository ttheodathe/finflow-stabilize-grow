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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/items/stock-movements")({
  head: () => ({ meta: [{ title: "Stock movements — Free Accounting" }] }),
  component: StockMovementsPage,
});

type Movement = {
  id: string;
  item_id: string;
  invoice_id: string | null;
  quantity_change: number;
  balance_after: number | null;
  reason: string;
  note: string | null;
  created_at: string;
  user_id: string;
  items?: { name: string; sku: string | null } | null;
  invoices?: { invoice_number: string } | null;
};

type ItemOpt = { id: string; name: string };
type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

const REASON_LABEL: Record<string, string> = {
  invoice_paid: "Invoice paid",
  invoice_reversed: "Payment reversed",
  invoice_deleted: "Paid invoice deleted",
};

function reasonVariant(r: string): "default" | "secondary" | "destructive" {
  if (r === "invoice_paid") return "default";
  if (r === "invoice_reversed") return "secondary";
  return "destructive";
}

function StockMovementsPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [items, setItems] = useState<ItemOpt[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [itemFilter, setItemFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("stock_movements")
      .select("*, items(name, sku), invoices(invoice_number)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (itemFilter !== "all") q = q.eq("item_id", itemFilter);
    const [mv, it] = await Promise.all([
      q,
      supabase
        .from("items")
        .select("id,name")
        .eq("type", "product")
        .eq("track_inventory", true)
        .order("name"),
    ]);
    if (mv.error) toast.error(mv.error.message);
    const movements = (mv.data ?? []) as Movement[];
    setRows(movements);
    if (it.data) setItems(it.data as ItemOpt[]);

    const userIds = Array.from(new Set(movements.map((m) => m.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const map: ProfileMap = {};
      for (const p of profs ?? []) map[p.id] = { full_name: p.full_name, email: p.email };
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [itemFilter]);

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = [
      "Changed at",
      "Changed by",
      "Changed by email",
      "Product",
      "SKU",
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
    for (const m of rows) {
      const p = profiles[m.user_id];
      lines.push(
        [
          new Date(m.created_at).toISOString(),
          p?.full_name ?? "",
          p?.email ?? "",
          m.items?.name ?? "",
          m.items?.sku ?? "",
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Stock movements</h1>
          <p className="text-muted-foreground">
            Audit trail of every inventory change driven by invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={exportCsv} disabled={loading || rows.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No stock movements yet. They appear automatically when a tracked product's invoice is
            marked paid.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Balance after</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const positive = Number(m.quantity_change) > 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{m.items?.name ?? "—"}</TableCell>
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
    </div>
  );
}
