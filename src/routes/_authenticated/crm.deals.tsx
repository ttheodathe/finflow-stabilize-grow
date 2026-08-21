import { createFileRoute } from "@tanstack/react-router";
import { scoped } from "@/lib/company-scope";
import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/crm/deals")({
  head: () => ({ meta: [{ title: "Pipeline — Finflow Track" }] }),
  component: DealsPage,
});

type Deal = {
  id: string;
  title: string;
  stage: string;
  value: number;
  currency: string;
  customer_id: string | null;
  expected_close_date: string | null;
  notes: string | null;
};

type Customer = { id: string; name: string };

const STAGES: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

function nextStage(stage: string): string | null {
  const order = ["new", "contacted", "proposal", "won"];
  const idx = order.indexOf(stage);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function DealsPage() {
  const companyId = useActiveCompanyId();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    value: "",
    currency: "USD",
    customer_id: "",
    expected_close_date: "",
    notes: "",
  });

  async function load() {
    if (!companyId) return;
    const [dealsRes, customersRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name"),
    ]);
    if (dealsRes.error) return toast.error(dealsRes.error.message);
    if (customersRes.error) return toast.error(customersRes.error.message);
    setDeals(dealsRes.data as Deal[]);
    setCustomers(customersRes.data as Customer[]);
  }

  useEffect(() => {
    load();
  }, [companyId]);

  function openNew() {
    setForm({
      title: "",
      value: "",
      currency: "USD",
      customer_id: "",
      expected_close_date: "",
      notes: "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      value: form.value ? Number(form.value) : 0,
      currency: form.currency,
      customer_id: form.customer_id || null,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
      stage: "new",
    };
    const { error } = await supabase.from("deals").insert(scoped(payload));
    if (error) return toast.error(error.message);
    toast.success("Deal created");
    setOpen(false);
    load();
  }

  async function moveStage(deal: Deal, stage: string) {
    const patch: Record<string, unknown> = { stage };
    if (stage === "won" || stage === "lost") patch.closed_at = new Date().toISOString();
    const { error } = await supabase.from("deals").update(patch).eq("id", deal.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this deal?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  const totalOpenValue = deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            {deals.length} deal{deals.length === 1 ? "" : "s"} · {formatCurrency(totalOpenValue, "USD")} open
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Annual bookkeeping contract"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
              </div>
              <div>
                <Label>Customer</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={(v) => setForm({ ...form, customer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unlinked" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected close date</Label>
                <Input
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Create deal
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAGES.map((stageDef) => {
          const stageDeals = deals.filter((d) => d.stage === stageDef.key);
          const stageValue = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
          return (
            <div key={stageDef.key} className="bg-muted/30 rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm">{stageDef.label}</h3>
                <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
              </div>
              {stageValue > 0 && (
                <p className="text-xs text-muted-foreground px-1 mb-2">
                  {formatCurrency(stageValue, "USD")}
                </p>
              )}
              <div className="space-y-2">
                {stageDeals.map((deal) => {
                  const customer = customers.find((c) => c.id === deal.customer_id);
                  const next = nextStage(deal.stage);
                  return (
                    <Card key={deal.id} className="p-3">
                      <p className="font-medium text-sm">{deal.title}</p>
                      {customer && (
                        <p className="text-xs text-muted-foreground">{customer.name}</p>
                      )}
                      <p className="text-sm mt-1">{formatCurrency(deal.value, deal.currency)}</p>
                      <div className="flex items-center justify-between mt-2">
                        {deal.stage !== "won" && deal.stage !== "lost" ? (
                          <div className="flex gap-1">
                            {next && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => moveStage(deal, next)}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                {STAGES.find((s) => s.key === next)?.label}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => moveStage(deal, "lost")}
                            >
                              Mark lost
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">
                            {deal.stage}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => remove(deal.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
                {stageDeals.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                    No deals
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
