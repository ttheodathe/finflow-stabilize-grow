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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/hr/departments")({
  head: () => ({ meta: [{ title: "Departments — Free Accounting" }] }),
  component: DepartmentsPage,
});

type Department = {
  id: string;
  name: string;
  description: string | null;
  cost_center_account_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  accounts?: { code: string; name: string } | null;
  employees?: { first_name: string; last_name: string } | null;
};
type Employee = { id: string; first_name: string; last_name: string };
type Account = { id: string; code: string; name: string };

const empty = {
  name: "",
  description: "",
  cost_center_account_id: "",
  manager_id: "",
  is_active: true,
};

function DepartmentsPage() {
  const companyId = useActiveCompanyId();
  const [items, setItems] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const [d, e, a] = await Promise.all([
      supabase
        .from("departments")
        .select("*, accounts(code,name), employees!departments_manager_id_fkey(first_name,last_name)")
        .eq("company_id", companyId)
        .order("name"),
      supabase.from("employees").select("id,first_name,last_name").eq("company_id", companyId).order("first_name"),
      supabase.from("accounts").select("id,code,name").eq("company_id", companyId).eq("is_active", true).order("code"),
    ]);
    if (d.error) toast.error(d.error.message);
    setItems((d.data ?? []) as unknown as Department[]);
    setEmployees((e.data ?? []) as Employee[]);
    setAccounts((a.data ?? []) as Account[]);
    setLoading(false);
  }

  useEffect(() => {
    setItems([]);
    load(); /* eslint-disable-next-line */
  }, [companyId]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(d: Department) {
    setEditing(d);
    setForm({
      name: d.name,
      description: d.description ?? "",
      cost_center_account_id: d.cost_center_account_id ?? "",
      manager_id: d.manager_id ?? "",
      is_active: d.is_active,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("Select a company first");
    if (!form.name.trim()) return toast.error("Name is required");
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      cost_center_account_id: form.cost_center_account_id || null,
      manager_id: form.manager_id || null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("departments").update(payload).eq("id", editing.id)
      : await supabase.from("departments").insert({ ...payload, company_id: companyId } as never);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Department updated" : "Department created");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this department? Employees assigned to it will become unassigned.")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground">Organize your team and report on cost centers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Manager</Label>
                <Select value={form.manager_id} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
                  <SelectTrigger><SelectValue placeholder="No manager assigned" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cost center account</Label>
                <Select
                  value={form.cost_center_account_id}
                  onValueChange={(v) => setForm({ ...form, cost_center_account_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="None — not tracked in accounting" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Lets Reports roll up this department's workforce cost against a GL account.
                </p>
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save department
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No departments yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Cost center</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    {d.employees ? `${d.employees.first_name} ${d.employees.last_name}` : "—"}
                  </TableCell>
                  <TableCell>{d.accounts ? `${d.accounts.code} · ${d.accounts.name}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? "default" : "secondary"}>
                      {d.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(d.id)}>
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
