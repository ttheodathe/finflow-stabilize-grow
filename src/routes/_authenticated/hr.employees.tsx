import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/hr/employees")({
  head: () => ({ meta: [{ title: "Employees — Finflow Track" }] }),
  component: EmployeesPage,
});

type Employee = {
  id: string;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  address: string | null;
  department_id: string | null;
  job_title: string | null;
  employment_type: string;
  employment_status: string;
  hire_date: string;
  termination_date: string | null;
  manager_id: string | null;
  salary: number;
  salary_currency: string;
  pay_frequency: string;
  notes: string | null;
  departments?: { name: string } | null;
};
type Department = { id: string; name: string };

const empty = {
  employee_number: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  national_id: "",
  address: "",
  department_id: "",
  job_title: "",
  employment_type: "full_time",
  employment_status: "active",
  hire_date: new Date().toISOString().slice(0, 10),
  termination_date: "",
  manager_id: "",
  salary: "0",
  salary_currency: "USD",
  pay_frequency: "monthly",
  notes: "",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  on_leave: "secondary",
  terminated: "destructive",
};

function fmtMoney(n: number, c: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
  } catch {
    return `${c} ${(n || 0).toFixed(2)}`;
  }
}

function EmployeesPage() {
  const companyId = useActiveCompanyId();
  const [items, setItems] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const [e, d] = await Promise.all([
      supabase
        .from("employees")
        .select("*, departments!employees_department_id_fkey(name)")
        .eq("company_id", companyId)
        .order("first_name"),
      supabase.from("departments").select("id,name").eq("company_id", companyId).eq("is_active", true).order("name"),
    ]);
    if (e.error) toast.error(e.error.message);
    setItems((e.data ?? []) as unknown as Employee[]);
    setDepartments((d.data ?? []) as Department[]);
    setLoading(false);
  }

  useEffect(() => {
    setItems([]);
    load(); /* eslint-disable-next-line */
  }, [companyId]);

  const managers = useMemo(
    () => items.filter((e) => !editing || e.id !== editing.id),
    [items, editing],
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (e) =>
          (statusFilter === "all" || e.employment_status === statusFilter) &&
          (departmentFilter === "all" || e.department_id === departmentFilter),
      ),
    [items, statusFilter, departmentFilter],
  );

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      employee_number: e.employee_number ?? "",
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email ?? "",
      phone: e.phone ?? "",
      date_of_birth: e.date_of_birth ?? "",
      national_id: e.national_id ?? "",
      address: e.address ?? "",
      department_id: e.department_id ?? "",
      job_title: e.job_title ?? "",
      employment_type: e.employment_type,
      employment_status: e.employment_status,
      hire_date: e.hire_date,
      termination_date: e.termination_date ?? "",
      manager_id: e.manager_id ?? "",
      salary: String(e.salary),
      salary_currency: e.salary_currency,
      pay_frequency: e.pay_frequency,
      notes: e.notes ?? "",
    });
    setOpen(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!companyId) return toast.error("Select a company first");
    if (!form.first_name.trim() || !form.last_name.trim()) return toast.error("First and last name are required");
    if (form.employment_status === "terminated" && !form.termination_date)
      return toast.error("Set a termination date");
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      employee_number: form.employee_number || null,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      national_id: form.national_id || null,
      address: form.address || null,
      department_id: form.department_id || null,
      job_title: form.job_title || null,
      employment_type: form.employment_type,
      employment_status: form.employment_status,
      hire_date: form.hire_date,
      termination_date: form.termination_date || null,
      manager_id: form.manager_id || null,
      salary: Number(form.salary) || 0,
      salary_currency: form.salary_currency,
      pay_frequency: form.pay_frequency,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("employees").update(payload).eq("id", editing.id)
      : await supabase
          .from("employees")
          .insert({ ...payload, company_id: companyId, created_by: u.user?.id } as never);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Employee updated" : "Employee added");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this employee record? This can't be undone.")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your team roster, contracts, and payroll details.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Date of birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <Label>National ID / SSN</Label>
                  <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-3">
                <div>
                  <Label>Employee number</Label>
                  <Input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <Label>Job title</Label>
                  <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reports to</Label>
                  <Select value={form.manager_id} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
                    <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                    <SelectContent>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employment type</Label>
                  <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.employment_status} onValueChange={(v) => setForm({ ...form, employment_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hire date</Label>
                  <Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} required />
                </div>
                {form.employment_status === "terminated" && (
                  <div>
                    <Label>Termination date</Label>
                    <Input type="date" value={form.termination_date} onChange={(e) => setForm({ ...form, termination_date: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="border-t pt-4 grid grid-cols-3 gap-3">
                <div>
                  <Label>Salary</Label>
                  <Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={form.salary_currency} onChange={(e) => setForm({ ...form, salary_currency: e.target.value })} />
                </div>
                <div>
                  <Label>Pay frequency</Label>
                  <Select value={form.pay_frequency} onValueChange={(v) => setForm({ ...form, pay_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>

              <Button type="submit" className="w-full bg-gradient-hero">
                Save employee
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On leave</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No employees yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.first_name} {e.last_name}
                    {e.employee_number && (
                      <span className="text-xs text-muted-foreground ml-1">#{e.employee_number}</span>
                    )}
                  </TableCell>
                  <TableCell>{e.job_title ?? "—"}</TableCell>
                  <TableCell>{e.departments?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{e.employment_type.replace("_", "-")}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[e.employment_status] ?? "secondary"} className="capitalize">
                      {e.employment_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fmtMoney(e.salary, e.salary_currency)}
                    <span className="text-xs text-muted-foreground">/{e.pay_frequency === "monthly" ? "mo" : e.pay_frequency === "biweekly" ? "2wk" : "wk"}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
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
