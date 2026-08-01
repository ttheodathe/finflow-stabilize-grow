import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations.
const supabase = _sb as any; // untyped-db
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Check, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/hr/leave")({
  head: () => ({ meta: [{ title: "Leave Management — FinFlow Track" }] }),
  component: LeavePage,
});

type LeaveType = {
  id: string;
  name: string;
  annual_allocation_days: number;
  is_paid: boolean;
  color: string;
  is_active: boolean;
};
type Employee = { id: string; first_name: string; last_name: string };
type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: string;
  review_note: string | null;
  employees?: { first_name: string; last_name: string } | null;
  leave_types?: { name: string; color: string } | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

function inclusiveDays(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function currentYearRange() {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function LeavePage() {
  const companyId = useActiveCompanyId();
  const [tab, setTab] = useState("requests");

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    employee_id: "",
    leave_type_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    days_requested: "1",
    reason: "",
  });

  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    annual_allocation_days: "0",
    is_paid: true,
    color: "#6366f1",
  });

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const { from, to } = currentYearRange();
    const [t, e, r] = await Promise.all([
      supabase.from("leave_types").select("*").eq("company_id", companyId).order("name"),
      supabase.from("employees").select("id,first_name,last_name").eq("company_id", companyId).eq("employment_status", "active").order("first_name"),
      supabase
        .from("leave_requests")
        .select("*, employees(first_name,last_name), leave_types(name,color)")
        .eq("company_id", companyId)
        .gte("start_date", from)
        .lte("start_date", to)
        .order("start_date", { ascending: false }),
    ]);
    if (r.error) toast.error(r.error.message);
    setTypes((t.data ?? []) as LeaveType[]);
    setEmployees((e.data ?? []) as Employee[]);
    setRequests((r.data ?? []) as unknown as LeaveRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    setRequests([]);
    setTypes([]);
    load(); /* eslint-disable-next-line */
  }, [companyId]);

  // Balance per employee+type = annual allocation minus days already
  // approved this calendar year. Computed on read from actual approved
  // requests rather than stored, so it can never drift out of sync.
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "approved") continue;
      const key = `${r.employee_id}:${r.leave_type_id}`;
      map.set(key, (map.get(key) ?? 0) + r.days_requested);
    }
    return map;
  }, [requests]);

  function balanceFor(employeeId: string, leaveTypeId: string) {
    const type = types.find((t) => t.id === leaveTypeId);
    if (!type) return null;
    const used = balances.get(`${employeeId}:${leaveTypeId}`) ?? 0;
    return { allocated: type.annual_allocation_days, used, remaining: type.annual_allocation_days - used };
  }

  const filteredRequests = useMemo(
    () => requests.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [requests, statusFilter],
  );

  function openNewRequest() {
    setReqForm({
      employee_id: "",
      leave_type_id: "",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      days_requested: "1",
      reason: "",
    });
    setReqOpen(true);
  }

  function onDateChange(patch: Partial<typeof reqForm>) {
    setReqForm((f) => {
      const next = { ...f, ...patch };
      next.days_requested = String(inclusiveDays(next.start_date, next.end_date) || 1);
      return next;
    });
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("Select a company first");
    if (!reqForm.employee_id) return toast.error("Select an employee");
    if (!reqForm.leave_type_id) return toast.error("Select a leave type");
    const days = Number(reqForm.days_requested);
    if (!days || days <= 0) return toast.error("Enter a valid number of days");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("leave_requests").insert({
      company_id: companyId,
      employee_id: reqForm.employee_id,
      leave_type_id: reqForm.leave_type_id,
      start_date: reqForm.start_date,
      end_date: reqForm.end_date,
      days_requested: days,
      reason: reqForm.reason || null,
      status: "pending",
      requested_by: u.user?.id,
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Leave request submitted");
    setReqOpen(false);
    load();
  }

  async function review(id: string, status: "approved" | "rejected") {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, reviewed_by: u.user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
    load();
  }

  async function cancelRequest(id: string) {
    if (!confirm("Cancel this leave request?")) return;
    const { error } = await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Request cancelled");
    load();
  }

  function openNewType() {
    setEditingType(null);
    setTypeForm({ name: "", annual_allocation_days: "0", is_paid: true, color: "#6366f1" });
    setTypeOpen(true);
  }
  function openEditType(t: LeaveType) {
    setEditingType(t);
    setTypeForm({
      name: t.name,
      annual_allocation_days: String(t.annual_allocation_days),
      is_paid: t.is_paid,
      color: t.color,
    });
    setTypeOpen(true);
  }
  async function saveType(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("Select a company first");
    if (!typeForm.name.trim()) return toast.error("Name is required");
    const payload = {
      name: typeForm.name.trim(),
      annual_allocation_days: Number(typeForm.annual_allocation_days) || 0,
      is_paid: typeForm.is_paid,
      color: typeForm.color,
    };
    const { error } = editingType
      ? await supabase.from("leave_types").update(payload).eq("id", editingType.id)
      : await supabase.from("leave_types").insert({ ...payload, company_id: companyId } as never);
    if (error) return toast.error(error.message);
    toast.success(editingType ? "Leave type updated" : "Leave type created");
    setTypeOpen(false);
    load();
  }
  async function removeType(id: string) {
    if (!confirm("Delete this leave type? Existing requests using it will be blocked from deletion until reassigned.")) return;
    const { error } = await supabase.from("leave_types").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground">Requests, approvals, and balances for {new Date().getFullYear()}.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="types">Leave types</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={reqOpen} onOpenChange={setReqOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewRequest} className="bg-gradient-hero">
                  <Plus className="h-4 w-4" /> New leave request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New leave request</DialogTitle></DialogHeader>
                <form onSubmit={submitRequest} className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={reqForm.employee_id} onValueChange={(v) => setReqForm({ ...reqForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Leave type</Label>
                    <Select value={reqForm.leave_type_id} onValueChange={(v) => setReqForm({ ...reqForm, leave_type_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {types.filter((t) => t.is_active).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reqForm.employee_id && reqForm.leave_type_id && (() => {
                      const b = balanceFor(reqForm.employee_id, reqForm.leave_type_id);
                      return b ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {b.remaining} of {b.allocated} days remaining this year
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start date</Label>
                      <Input type="date" value={reqForm.start_date} onChange={(e) => onDateChange({ start_date: e.target.value })} required />
                    </div>
                    <div>
                      <Label>End date</Label>
                      <Input type="date" value={reqForm.end_date} onChange={(e) => onDateChange({ end_date: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <Label>Days</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={reqForm.days_requested}
                      onChange={(e) => setReqForm({ ...reqForm, days_requested: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-filled from the date range (calendar days) — adjust for half-days or to exclude weekends/holidays.
                    </p>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })} rows={2} />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-hero">Submit request</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card border rounded-xl">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Loading…</div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No leave requests {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.leave_types?.color ?? "#999" }} />
                          {r.leave_types?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{r.start_date} → {r.end_date}</TableCell>
                      <TableCell>{r.days_requested}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"} className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => review(r.id, "approved")} title="Approve">
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => review(r.id, "rejected")} title="Reject">
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : r.status === "approved" ? (
                          <Button variant="ghost" size="sm" onClick={() => cancelRequest(r.id)}>Cancel</Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <div className="bg-card border rounded-xl">
            {employees.length === 0 || types.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                Add employees and at least one leave type to see balances.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    {types.filter((t) => t.is_active).map((t) => (
                      <TableHead key={t.id}>{t.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                      {types.filter((t) => t.is_active).map((t) => {
                        const b = balanceFor(emp.id, t.id);
                        return (
                          <TableCell key={t.id}>
                            {b ? `${b.remaining} / ${b.allocated}` : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="types" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewType} className="bg-gradient-hero">
                  <Plus className="h-4 w-4" /> New leave type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingType ? "Edit leave type" : "New leave type"}</DialogTitle></DialogHeader>
                <form onSubmit={saveType} className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required placeholder="e.g. Annual Leave" />
                  </div>
                  <div>
                    <Label>Annual allocation (days)</Label>
                    <Input type="number" step="0.5" value={typeForm.annual_allocation_days} onChange={(e) => setTypeForm({ ...typeForm, annual_allocation_days: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Paid leave</Label>
                    <Switch checked={typeForm.is_paid} onCheckedChange={(v) => setTypeForm({ ...typeForm, is_paid: v })} />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input type="color" value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} className="h-10 w-20" />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-hero">Save leave type</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-card border rounded-xl">
            {types.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No leave types yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Annual allocation</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </span>
                      </TableCell>
                      <TableCell>{t.annual_allocation_days} days</TableCell>
                      <TableCell>{t.is_paid ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditType(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeType(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
