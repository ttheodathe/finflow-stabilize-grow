import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/purchases/vendors")({
  head: () => ({ meta: [{ title: "Vendors — Free Accounting" }] }),
  component: VendorsPage,
});

type Vendor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: number;
  tax_id: string | null;
  is_1099: boolean;
  notes: string | null;
};

const empty = {
  name: "",
  email: "",
  phone: "",
  address: "",
  payment_terms: 30,
  tax_id: "",
  is_1099: false,
  notes: "",
};

function VendorsPage() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...empty });

  async function load() {
    const { data, error } = await (supabase as any).from("vendors").select("*").order("name");
    if (error) toast.error(error.message);
    else setItems(data as Vendor[]);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(v: Vendor) {
    setEditing(v.id);
    setForm({
      name: v.name,
      email: v.email ?? "",
      phone: v.phone ?? "",
      address: v.address ?? "",
      payment_terms: v.payment_terms,
      tax_id: v.tax_id ?? "",
      is_1099: v.is_1099,
      notes: v.notes ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      payment_terms: Number(form.payment_terms) || 0,
      tax_id: form.tax_id || null,
      is_1099: form.is_1099,
      notes: form.notes || null,
    };
    const q = editing
      ? (supabase as any).from("vendors").update(payload).eq("id", editing)
      : (supabase as any).from("vendors").insert({ ...payload, user_id: u.user.id });
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(editing ? "Vendor updated" : "Vendor added");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this vendor?")) return;
    const { error } = await (supabase as any).from("vendors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">
            Suppliers, contact details, payment terms, and 1099 status.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit vendor" : "New vendor"}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment terms (days)</Label>
                  <Input
                    type="number"
                    value={form.payment_terms}
                    onChange={(e) => setForm({ ...form, payment_terms: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Tax ID / EIN</Label>
                  <Input
                    value={form.tax_id}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_1099}
                  onCheckedChange={(v) => setForm({ ...form, is_1099: !!v })}
                />
                Requires 1099 reporting
              </label>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                {editing ? "Save changes" : "Create vendor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No vendors yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Tax ID</TableHead>
                <TableHead>1099</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.email ?? "—"}</TableCell>
                  <TableCell>{v.phone ?? "—"}</TableCell>
                  <TableCell>Net {v.payment_terms}</TableCell>
                  <TableCell>{v.tax_id ?? "—"}</TableCell>
                  <TableCell>{v.is_1099 && <Badge>1099</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(v.id)}>
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
