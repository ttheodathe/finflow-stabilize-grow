import { createFileRoute, Link } from "@tanstack/react-router";
import { scoped } from "@/lib/company-scope";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight, ReceiptText, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { lockExchangeRate } from "@/lib/fx-lock";

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
  invoice_id: string | null;
};

type Customer = { id: string; name: string };
type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  status: string;
  total: number;
  base_currency_amount: number | null;
};

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
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});
  const [companyCurrency, setCompanyCurrency] = useState("USD");
  const [invNumbering, setInvNumbering] = useState({ prefix: "INV-", next: 1 });
  const [open, setOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
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
    const { data: u } = await supabase.auth.getUser();
    const [dealsRes, customersRes, invRes, paymentsRes, compRes, wsRes] = await Promise.all([
      supabase.from("deals").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name").eq("company_id", companyId).order("name"),
      supabase
        .from("invoices")
        .select("id,invoice_number,customer_id,status,total,base_currency_amount")
        .eq("company_id", companyId),
      supabase.from("payments").select("invoice_id, amount").eq("company_id", companyId),
      supabase.from("companies").select("currency").eq("id", companyId).maybeSingle(),
      u.user
        ? supabase
            .from("workspace_settings")
            .select("invoice_prefix,invoice_next_number")
            .eq("user_id", u.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (dealsRes.error) return toast.error(dealsRes.error.message);
    if (customersRes.error) return toast.error(customersRes.error.message);
    setDeals(dealsRes.data as Deal[]);
    setCustomers(customersRes.data as Customer[]);
    if (invRes.data) setInvoices(invRes.data as InvoiceRow[]);
    if (compRes.data?.currency) setCompanyCurrency(compRes.data.currency);
    if (wsRes.data) {
      setInvNumbering({
        prefix: wsRes.data.invoice_prefix ?? "INV-",
        next: wsRes.data.invoice_next_number ?? 1,
      });
    }

    // Outstanding balance per invoice, in company base currency — this
    // is the "sales sees financial reality instantly" gap most CRM+
    // accounting combos never close, because there's no second system
    // and no sync delay: it's the same query hitting the same ledger.
    const paidByInvoice: Record<string, number> = {};
    (paymentsRes.data ?? []).forEach((p: any) => {
      paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] ?? 0) + Number(p.amount);
    });
    setPaidMap(paidByInvoice);
  }
  useEffect(() => {
    load();
  }, [companyId]);

  // customer_id -> outstanding balance owed, in company base currency
  const customerBalances = useMemo(() => {
    const paidTotalsByInvoice: Record<string, number> = paidMap;
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      if (!inv.customer_id || inv.status === "draft") continue;
      const invTotalBase = Number(inv.base_currency_amount ?? inv.total);
      // approximate paid-in-base by the same proportion of total paid in
      // invoice currency — matches how the ledger books the settlement
      const paidForeign = paidTotalsByInvoice[inv.id] ?? 0;
      const paidBase = inv.total ? (paidForeign / Number(inv.total)) * invTotalBase : 0;
      const outstanding = invTotalBase - paidBase;
      if (outstanding > 0.01) {
        map[inv.customer_id] = (map[inv.customer_id] ?? 0) + outstanding;
      }
    }
    return map;
  }, [invoices, paidMap]);

  const invoiceById = useMemo(() => {
    const map: Record<string, InvoiceRow> = {};
    for (const inv of invoices) map[inv.id] = inv;
    return map;
  }, [invoices]);

  function openNew() {
    setForm({
      title: "",
      value: "",
      currency: companyCurrency,
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

  // Quote-to-cash in one step: a won deal becomes an invoice by
  // creating it directly in the SAME accounting tables the rest of the
  // app uses — not a "synced" copy in a separate CRM invoice module the
  // way Zoho CRM's own Quotes/Invoices sit apart from Zoho Books. One
  // record, one source of truth, posts to the ledger immediately.
  async function convertToInvoice(deal: Deal) {
    if (!companyId) return;
    if (!deal.customer_id) return toast.error("Link a customer to this deal before converting");
    if (deal.value <= 0) return toast.error("Deal value must be positive");
    if (!confirm(`Create an invoice for ${formatCurrency(deal.value, deal.currency)} from "${deal.title}"?`))
      return;

    setConvertingId(deal.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { rate, companyCurrency: cc } = await lockExchangeRate(companyId, deal.currency);
      const baseAmt = deal.currency === cc ? deal.value : deal.value * rate;
      const invoiceNumber = `${invNumbering.prefix}${invNumbering.next}`;

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert(
          scoped({
            user_id: u.user.id,
            invoice_number: invoiceNumber,
            customer_id: deal.customer_id,
            issue_date: new Date().toISOString().slice(0, 10),
            status: "sent",
            currency: deal.currency,
            subtotal: deal.value,
            tax: 0,
            total: deal.value,
            notes: `Converted from deal: ${deal.title}`,
            exchange_rate: rate,
            base_currency_amount: baseAmt,
          }),
        )
        .select("id")
        .single();
      if (invErr || !inv) {
        if (invErr?.message?.includes("invoice_weekly_limit_reached")) {
          return toast.error("Free plan allows up to 20 invoices per 7 days. Upgrade for unlimited.");
        }
        return toast.error(invErr?.message ?? "Could not create invoice");
      }

      const { error: itemErr } = await supabase.from("invoice_items").insert(
        scoped({
          invoice_id: inv.id,
          user_id: u.user.id,
          description: deal.title,
          quantity: 1,
          unit_price: deal.value,
          tax_rate: 0,
          amount: deal.value,
        }),
      );
      if (itemErr) return toast.error(itemErr.message);

      // Fires the ledger-posting trigger now that the line item exists —
      // same deferred-then-repost pattern the Invoices page uses.
      await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id);

      await supabase
        .from("workspace_settings")
        .update({ invoice_next_number: invNumbering.next + 1 })
        .eq("user_id", u.user.id);

      const { error: dealErr } = await supabase
        .from("deals")
        .update({ invoice_id: inv.id, converted_at: new Date().toISOString() })
        .eq("id", deal.id);
      if (dealErr) return toast.error(dealErr.message);

      toast.success(`Invoice ${invoiceNumber} created and posted to the ledger`);
      load();
    } finally {
      setConvertingId(null);
    }
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
                        {customerBalances[c.id] > 0
                          ? ` — owes ${formatCurrency(customerBalances[c.id], companyCurrency)}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Linking a customer shows their live account balance right on the deal card —
                  no separate CRM sync required.
                </p>
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
                  const balance = deal.customer_id ? customerBalances[deal.customer_id] : undefined;
                  const linkedInvoice = deal.invoice_id ? invoiceById[deal.invoice_id] : undefined;
                  const next = nextStage(deal.stage);
                  return (
                    <Card key={deal.id} className="p-3">
                      <p className="font-medium text-sm">{deal.title}</p>
                      {customer && (
                        <p className="text-xs text-muted-foreground">{customer.name}</p>
                      )}
                      <p className="text-sm mt-1">{formatCurrency(deal.value, deal.currency)}</p>

                      {/* Live account balance — pulled from the same
                          invoices/payments tables the rest of the app
                          uses, so it's never stale the way a "syncs
                          every 2 hours" CRM+accounting integration is. */}
                      {balance !== undefined && balance > 0.01 && (
                        <Badge variant="destructive" className="mt-1.5 gap-1 font-normal text-[10px]">
                          <CircleAlert className="h-2.5 w-2.5" />
                          Owes {formatCurrency(balance, companyCurrency)}
                        </Badge>
                      )}

                      {linkedInvoice && (
                        <Badge variant="secondary" className="mt-1.5 gap-1 font-normal text-[10px]">
                          <ReceiptText className="h-2.5 w-2.5" />
                          {linkedInvoice.invoice_number} · {linkedInvoice.status}
                        </Badge>
                      )}

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
                        ) : deal.stage === "won" && !deal.invoice_id ? (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-gradient-hero"
                            disabled={convertingId === deal.id}
                            onClick={() => convertToInvoice(deal)}
                          >
                            <ReceiptText className="h-3 w-3 mr-1" />
                            {convertingId === deal.id ? "Creating…" : "Convert to invoice"}
                          </Button>
                        ) : linkedInvoice ? (
                          <Link to="/invoices" className="text-xs text-primary hover:underline">
                            View invoice →
                          </Link>
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
