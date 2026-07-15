import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type Item = {
  id: string;
  type: "product" | "service";
  name: string;
  description: string | null;
  sku: string | null;
  category_id: string | null;
  price: number;
  cost: number;
  tax_rate: number;
  currency: string;
  unit: string | null;
  track_inventory: boolean;
  stock_quantity: number;
  is_active: boolean;
  item_categories?: { name: string; color: string | null } | null;
};

type Category = { id: string; name: string };

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

export function ItemsManager({
  type,
  title,
  description,
}: {
  type: "product" | "service";
  title: string;
  description: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    category_id: "",
    price: "0",
    cost: "0",
    tax_rate: "0",
    currency: "USD",
    unit: type === "service" ? "hour" : "unit",
    track_inventory: type === "product",
    stock_quantity: "0",
    is_active: true,
  });

  async function load() {
    const [i, c] = await Promise.all([
      supabase
        .from("items")
        .select("*, item_categories(name, color)")
        .eq("type", type)
        .order("created_at", { ascending: false }),
      supabase.from("item_categories").select("id,name").order("name"),
    ]);
    if (i.error) toast.error(i.error.message);
    else setItems(i.data as Item[]);
    if (c.data) setCategories(c.data as Category[]);
  }
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [type]);

  function openNew() {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      sku: "",
      category_id: "",
      price: "0",
      cost: "0",
      tax_rate: "0",
      currency: "USD",
      unit: type === "service" ? "hour" : "unit",
      track_inventory: type === "product",
      stock_quantity: "0",
      is_active: true,
    });
    setOpen(true);
  }
  function openEdit(it: Item) {
    setEditing(it);
    setForm({
      name: it.name,
      description: it.description ?? "",
      sku: it.sku ?? "",
      category_id: it.category_id ?? "",
      price: String(it.price),
      cost: String(it.cost),
      tax_rate: String(it.tax_rate),
      currency: it.currency,
      unit: it.unit ?? "unit",
      track_inventory: it.track_inventory,
      stock_quantity: String(it.stock_quantity),
      is_active: it.is_active,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id,
      type,
      name: form.name,
      description: form.description || null,
      sku: form.sku || null,
      category_id: form.category_id || null,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      tax_rate: Number(form.tax_rate) || 0,
      currency: form.currency,
      unit: form.unit || null,
      track_inventory: form.track_inventory,
      stock_quantity: Number(form.stock_quantity) || 0,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("items").update(payload).eq("id", editing.id)
      : await supabase.from("items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? `${title} updated` : `${title} created`);
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${title.toLowerCase()}?`)) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New {title.toLowerCase().replace(/s$/, "")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? `Edit ${title.toLowerCase().replace(/s$/, "")}`
                  : `New ${title.toLowerCase().replace(/s$/, "")}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{type === "product" ? "SKU" : "Code"}</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No categories yet
                        </div>
                      )}
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tax %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>
              {type === "product" && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label>Track inventory</Label>
                    <p className="text-xs text-muted-foreground">Decrement stock as you invoice.</p>
                  </div>
                  <Switch
                    checked={form.track_inventory}
                    onCheckedChange={(v) => setForm({ ...form, track_inventory: v })}
                  />
                </div>
              )}
              {type === "product" && form.track_inventory && (
                <div>
                  <Label>Stock quantity</Label>
                  <Input
                    type="number"
                    step="1"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No {title.toLowerCase()} yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>{type === "product" ? "SKU" : "Code"}</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                {type === "product" && <TableHead className="text-right">Stock</TableHead>}
                <TableHead></TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell>{it.item_categories?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{it.sku ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmt(Number(it.price), it.currency)}</TableCell>
                  <TableCell className="text-right">{Number(it.tax_rate)}%</TableCell>
                  {type === "product" && (
                    <TableCell className="text-right">
                      {it.track_inventory ? Number(it.stock_quantity) : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    {!it.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(it)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
