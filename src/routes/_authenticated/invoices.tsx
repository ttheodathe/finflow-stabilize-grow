import { createFileRoute } from "@tanstack/react-router";
import { scoped } from "@/lib/company-scope";
import { useEffect, useMemo, useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations.
const supabase = _sb as any; // untyped-db
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Clock,
  Pencil,
  Trash2,
  X,
  Download,
  Mail,
  MailCheck,
  Loader2,
  Link2,
  Copy,
  RefreshCw,
  Link2Off,
} from "lucide-react";
import { toast } from "sonner";
import { CurrencySelect } from "@/components/currency-select";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { lockExchangeRate } from "@/lib/fx-lock";
import { notifyCompanyMembers } from "@/lib/notify";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";
import { useSubscriptionLimits } from "@/lib/subscription-limits";
import type { PlanKey } from "@/lib/paddle/config";
import { trackAccountingAction } from "@/lib/analytics";
import { usePermissions } from "@/hooks/usePermissions";
import {
  formatRelativeContact,
  getDaysSilent,
  toLocalDateTimeInput,
  type InvoiceContactChannel,
} from "@/lib/invoice-followups";

type InvoicingSettings = {
  invoicePrefix: string;
  invoiceNextNumber: number;
  defaultPaymentTermsDays: number;
  defaultInvoiceNotes: string | null;
};

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Finflow Track" }] }),
  component: InvoicesPage,
});

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  customers?: { name: string; email: string | null } | null;
  share_token: string;
  share_token_expires_at: string | null;
  share_token_revoked_at: string | null;
  sent_at: string | null;
};
type InvoiceFollowup = {
  id: string;
  invoice_id: string;
  contacted_at: string;
  channel: InvoiceContactChannel;
  note: string | null;
  created_at: string;
};
type Customer = { id: string; name: string };
type CatalogItem = {
  id: string;
  name: string;
  price: number;
  tax_rate: number;
  type: string;
  stock_quantity: number | null;
  track_inventory: boolean;
};
type Line = {
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

const STATUSES = ["draft", "sent", "partial", "paid", "overdue"];

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function InvoicesPage() {
  const companyId = useActiveCompanyId();
  const defaultCurrency = useDefaultCurrency();
  const { can: canPermission } = usePermissions(companyId ?? "");
  const canEditInvoices = canPermission("invoice.edit");
  const [items, setItems] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [invSettings, setInvSettings] = useState<InvoicingSettings>({
    invoicePrefix: "INV-",
    invoiceNextNumber: 1,
    defaultPaymentTermsDays: 30,
    defaultInvoiceNotes: null,
  });
  const [form, setForm] = useState({
    invoice_number: "",
    customer_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    currency: defaultCurrency,
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [weeklyUsage, setWeeklyUsage] = useState<{ used: number; limit: number | null } | null>(
    null,
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { plan } = useSubscriptionLimits(companyId);
  const [companyName, setCompanyName] = useState("Finflow Track");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [shareDialogInvoice, setShareDialogInvoice] = useState<Invoice | null>(null);
  const [shareActionBusy, setShareActionBusy] = useState(false);
  const [lastContactAtByInvoice, setLastContactAtByInvoice] = useState<Record<string, string>>({});
  const [followupInvoice, setFollowupInvoice] = useState<Invoice | null>(null);
  const [followups, setFollowups] = useState<InvoiceFollowup[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [followupSaving, setFollowupSaving] = useState(false);
  const [followupDate, setFollowupDate] = useState(() => toLocalDateTimeInput());
  const [followupChannel, setFollowupChannel] = useState<InvoiceContactChannel>("email");
  const [followupNote, setFollowupNote] = useState("");
  const [contactFilter, setContactFilter] = useState("all");
  const [sortBySilence, setSortBySilence] = useState(false);

  async function loadWeeklyUsage() {
    if (!companyId) return;
    const { data } = await supabase.rpc("get_weekly_invoice_usage", { p_company_id: companyId });
    if (data) setWeeklyUsage(data as { used: number; limit: number | null });
  }

  async function load() {
    if (!companyId) return;
    setLastContactAtByInvoice({});
    const { data: u } = await supabase.auth.getUser();
    const [inv, cust, cat, ws, comp, followupRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, customers(name,email)")
        .eq("company_id", companyId)
        .order("issue_date", { ascending: false }),
      supabase.from("customers").select("id,name").eq("company_id", companyId).order("name"),
      supabase
        .from("items")
        .select("id,name,price,tax_rate,type,stock_quantity,track_inventory")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name"),
      u.user
        ? supabase
            .from("workspace_settings")
            .select(
              "invoice_prefix,invoice_next_number,default_payment_terms_days,default_invoice_notes",
            )
            .eq("user_id", u.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("companies").select("name").eq("id", companyId).maybeSingle(),
      supabase
        .from("invoice_followups")
        .select("invoice_id,contacted_at")
        .eq("company_id", companyId)
        .order("contacted_at", { ascending: false }),
    ]);
    if (inv.error) toast.error(inv.error.message);
    else setItems(inv.data as unknown as Invoice[]);
    if (followupRes.error) toast.error("Unable to load invoice contact history.");
    else {
      const latest: Record<string, string> = {};
      for (const entry of followupRes.data ?? []) {
        if (!latest[entry.invoice_id]) latest[entry.invoice_id] = entry.contacted_at;
      }
      setLastContactAtByInvoice(latest);
    }
    if (cust.data) setCustomers(cust.data as Customer[]);
    if (cat.data) setCatalog(cat.data as CatalogItem[]);
    if (ws.data) {
      setInvSettings({
        invoicePrefix: ws.data.invoice_prefix ?? "INV-",
        invoiceNextNumber: ws.data.invoice_next_number ?? 1,
        defaultPaymentTermsDays: ws.data.default_payment_terms_days ?? 30,
        defaultInvoiceNotes: ws.data.default_invoice_notes ?? null,
      });
    }
    if (comp.data?.name) setCompanyName(comp.data.name);
  }

  async function openFollowups(inv: Invoice) {
    if (!companyId) return;
    setFollowupInvoice(inv);
    setFollowups([]);
    setFollowupDate(toLocalDateTimeInput());
    setFollowupChannel("email");
    setFollowupNote("");
    setFollowupsLoading(true);
    const { data, error } = await supabase
      .from("invoice_followups")
      .select("id,invoice_id,contacted_at,channel,note,created_at")
      .eq("company_id", companyId)
      .eq("invoice_id", inv.id)
      .order("contacted_at", { ascending: false });
    if (error) toast.error("Unable to load follow-up history.");
    else setFollowups((data ?? []) as InvoiceFollowup[]);
    setFollowupsLoading(false);
  }

  async function saveFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !followupInvoice || !canEditInvoices) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return toast.error("Please sign in again.");
    const contactedAt = new Date(followupDate);
    if (Number.isNaN(contactedAt.getTime())) {
      return toast.error("Choose a valid contact date.");
    }
    setFollowupSaving(true);
    const { data, error } = await supabase
      .from("invoice_followups")
      .insert({
        company_id: companyId,
        invoice_id: followupInvoice.id,
        contacted_at: contactedAt.toISOString(),
        channel: followupChannel,
        note: followupNote.trim() || null,
        created_by: userData.user.id,
      })
      .select("id,invoice_id,contacted_at,channel,note,created_at")
      .single();
    if (error) toast.error(error.message);
    else {
      setFollowups((current) =>
        [data as InvoiceFollowup, ...current].sort(
          (a, b) => new Date(b.contacted_at).getTime() - new Date(a.contacted_at).getTime(),
        ),
      );
      setLastContactAtByInvoice((current) => ({
        ...current,
        [followupInvoice.id]:
          !current[followupInvoice.id] ||
          contactedAt.getTime() > new Date(current[followupInvoice.id]).getTime()
            ? contactedAt.toISOString()
            : current[followupInvoice.id],
      }));
      setFollowupNote("");
      toast.success("Follow-up recorded.");
    }
    setFollowupSaving(false);
  }

  async function deleteFollowup(id: string) {
    if (!companyId || !followupInvoice || !canEditInvoices) return;
    if (!confirm("Delete this follow-up entry?")) return;
    const { error } = await supabase
      .from("invoice_followups")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("invoice_id", followupInvoice.id);
    if (error) return toast.error(error.message);
    const next = followups.filter((entry) => entry.id !== id);
    setFollowups(next);
    setLastContactAtByInvoice((current) => {
      const updated = { ...current };
      if (next[0]) updated[followupInvoice.id] = next[0].contacted_at;
      else delete updated[followupInvoice.id];
      return updated;
    });
    toast.success("Follow-up deleted.");
  }

  function isShareLinkActive(inv: Invoice) {
    return (
      !inv.share_token_revoked_at &&
      (!inv.share_token_expires_at || new Date(inv.share_token_expires_at).getTime() > Date.now())
    );
  }

  async function copyInvoiceShareLink() {
    if (!shareDialogInvoice || !isShareLinkActive(shareDialogInvoice)) return;
    const url = `${window.location.origin}/invoice/${shareDialogInvoice.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invoice link copied.");
    } catch {
      toast.error("Unable to copy the invoice link.");
    }
  }

  async function updateInvoiceShareLink(action: "revoke" | "regenerate") {
    if (!shareDialogInvoice) return;
    setShareActionBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch("/api/invoices/share-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          invoiceId: shareDialogInvoice.id,
          action,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error ?? "Unable to update invoice link.");
        return;
      }

      const updated = {
        ...shareDialogInvoice,
        share_token: result.shareToken,
        share_token_expires_at: result.expiresAt,
        share_token_revoked_at: result.revokedAt,
      };
      setShareDialogInvoice(updated);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(
        action === "revoke"
          ? "Invoice link revoked."
          : "New invoice link generated. The previous link no longer works.",
      );
    } catch {
      toast.error("Unable to update invoice link. Please try again.");
    } finally {
      setShareActionBusy(false);
    }
  }

  async function sendInvoiceEmail(inv: Invoice) {
    const email = inv.customers?.email;
    if (!email) {
      toast.error("This customer has no email address on file.");
      return;
    }
    setSendingId(inv.id);
    try {
      // The server loads the recipient, amounts and link from the invoice record and checks
      // that this user belongs to the invoice's company. Only the id is sent.
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token;
      if (!accessToken) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ invoiceId: inv.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.error) {
        toast.error(result.error ?? "Failed to send invoice");
        return;
      }
      const { error } = await supabase
        .from("invoices")
        .update({ sent_at: new Date().toISOString() } as any)
        .eq("id", inv.id);
      if (error) toast.error(error.message);
      toast.success(`Invoice sent to ${email}`);
      load();
    } catch {
      toast.error("Failed to send invoice — check your connection and try again.");
    } finally {
      setSendingId(null);
    }
  }
  useEffect(() => {
    load();
    loadWeeklyUsage();
  }, [companyId]);

  const totals = useMemo(() => {
    let subtotal = 0,
      tax = 0;
    for (const l of lines) {
      const lineAmount = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
      subtotal += lineAmount;
      tax += lineAmount * ((Number(l.tax_rate) || 0) / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  function openNew() {
    setEditing(null);
    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + (invSettings.defaultPaymentTermsDays || 0) * 86400000)
      .toISOString()
      .slice(0, 10);
    setForm({
      // Fix (Jennifer QA — New Invoice: "Invoice # set under Settings does
      // not automatically populate. It needs to be manually entered."):
      // build the number from the Invoicing settings (prefix + next number)
      // instead of a random timestamp that ignored those settings entirely.
      invoice_number: `${invSettings.invoicePrefix}${invSettings.invoiceNextNumber}`,
      customer_id: "",
      issue_date: issueDate,
      due_date: dueDate,
      status: "draft",
      currency: defaultCurrency,
      notes: invSettings.defaultInvoiceNotes ?? "",
    });
    setLines([]);
    setOpen(true);
  }
  async function openEdit(i: Invoice) {
    if (!companyId) return;
    setEditing(i);
    setForm({
      invoice_number: i.invoice_number,
      customer_id: i.customer_id ?? "",
      issue_date: i.issue_date,
      due_date: i.due_date ?? "",
      status: i.status,
      currency: i.currency,
      notes: "",
    });
    const { data } = await supabase
      .from("invoice_items")
      .select("item_id,description,quantity,unit_price,tax_rate")
      .eq("company_id", companyId)
      .eq("invoice_id", i.id);
    setLines(
      (data ?? []).map((d: any) => ({
        item_id: d.item_id,
        description: d.description,
        quantity: Number(d.quantity),
        unit_price: Number(d.unit_price),
        tax_rate: Number(d.tax_rate ?? 0),
      })),
    );
    setOpen(true);
  }

  function addCatalog(itemId: string) {
    const it = catalog.find((c) => c.id === itemId);
    if (!it) return;
    setLines((l) => [
      ...l,
      {
        item_id: it.id,
        description: it.name,
        quantity: 1,
        unit_price: Number(it.price),
        tax_rate: Number(it.tax_rate),
      },
    ]);
  }
  function addBlank() {
    setLines((l) => [
      ...l,
      { item_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
    ]);
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((l) => l.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  }
  function removeLine(idx: number) {
    setLines((l) => l.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!companyId) return toast.error("No active company selected");
    const { rate, companyCurrency } = await lockExchangeRate(companyId, form.currency);
    const payload = {
      user_id: u.user.id,
      company_id: companyId,
      invoice_number: form.invoice_number,
      customer_id: form.customer_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      // New invoices are staged as drafts until their line items exist. This
      // lets the database post the ledger and stock effects only after the
      // complete invoice has been saved.
      status: editing ? form.status : "draft",
      currency: form.currency,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      notes: form.notes,
      exchange_rate: rate,
      base_currency_amount: form.currency === companyCurrency ? totals.total : totals.total * rate,
    };

    let invoiceId = editing?.id;
    const becamePaid = editing?.status !== "paid" && form.status === "paid";
    if (editing) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase
        .from("invoices")
        .insert(scoped(payload))
        .select("id")
        .single();
      if (error || !data) {
        if (error?.message?.includes("invoice_weekly_limit_reached")) {
          setUpgradeOpen(true);
          return toast.error(
            "Free plan allows up to 20 invoices per 7 days. Upgrade for unlimited.",
          );
        }
        return toast.error(error?.message ?? "Insert failed");
      }
      invoiceId = (data as any).id;
      loadWeeklyUsage();

      // Auto-increment "Next invoice number" in Settings so the next new
      // invoice picks up the following number without manual entry.
      const nextNumber = invSettings.invoiceNextNumber + 1;
      await supabase
        .from("workspace_settings")
        .update({ invoice_next_number: nextNumber })
        .eq("user_id", u.user.id);
      setInvSettings((s) => ({ ...s, invoiceNextNumber: nextNumber }));
    }

    if (invoiceId) {
      const { error: deleteItemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoiceId);
      if (deleteItemsError) return toast.error(deleteItemsError.message);
      if (lines.length > 0) {
        const rows = lines.map((l) => ({
          invoice_id: invoiceId!,
          user_id: u.user!.id,
          company_id: companyId,
          item_id: l.item_id,
          description: l.description || "Item",
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          tax_rate: Number(l.tax_rate) || 0,
          amount: (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        }));
        const { error } = await supabase.from("invoice_items").insert(scoped(rows));
        if (error) {
          if (!editing) await supabase.from("invoices").delete().eq("id", invoiceId);
          return toast.error(error.message);
        }
      }
      // For new invoices this transitions draft -> requested status after
      // the line items are present. The same database event posts the ledger
      // and dispatches tracked inventory once. Existing invoice edits retain
      // their current status workflow.
      const { error: finalizeError } = await supabase
        .from("invoices")
        .update({ status: form.status })
        .eq("id", invoiceId);
      if (finalizeError) return toast.error(finalizeError.message);
    }

    toast.success(editing ? "Invoice updated" : "Invoice created");
    if (!editing && companyId) void trackAccountingAction(companyId, "invoice");
    if (becamePaid && companyId) {
      const customerName = customers.find((c) => c.id === form.customer_id)?.name;
      notifyCompanyMembers(
        companyId,
        {
          type: "invoice_paid",
          title: `Invoice ${form.invoice_number} paid`,
          body: customerName
            ? `${fmt(totals.total, form.currency)} received from ${customerName}`
            : `${fmt(totals.total, form.currency)} received`,
          link: "/invoices",
        },
        { excludeUserId: u.user.id },
      );
    }
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this invoice?")) return;
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  async function downloadPdf(inv: Invoice) {
    if (!companyId) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: company }, { data: customer }, { data: lineRows }] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      inv.customer_id
        ? supabase
            .from("customers")
            .select("name,email,address")
            .eq("company_id", companyId)
            .eq("id", inv.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("invoice_items")
        .select("description,quantity,unit_price,tax_rate")
        .eq("company_id", companyId)
        .eq("invoice_id", inv.id),
    ]);
    let logoSigned: string | null = null;
    if ((company as any)?.logo_url) {
      const { data: s } = await supabase.storage
        .from("company-logos")
        .createSignedUrl((company as any).logo_url, 3600);
      logoSigned = s?.signedUrl ?? null;
    }
    await generateInvoicePdf({
      invoice: {
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        currency: inv.currency,
        subtotal: Number(inv.subtotal),
        tax: Number(inv.tax),
        total: Number(inv.total),
        notes: null,
      },
      lines: (lineRows ?? []).map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        tax_rate: Number(l.tax_rate ?? 0),
      })),
      company: company ? { ...(company as any), logo_url: logoSigned } : null,
      customer: (customer as any) ?? null,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Create and track invoices using your real catalog.
          </p>
        </div>
        {weeklyUsage && weeklyUsage.used >= (weeklyUsage.limit ?? Infinity) ? (
          <Button onClick={() => setUpgradeOpen(true)} className="bg-gradient-hero">
            <Plus className="h-4 w-4" /> Upgrade for unlimited invoices
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-hero">
                <Plus className="h-4 w-4" /> New invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit invoice" : "New invoice"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Invoice number</Label>
                    <Input
                      required
                      value={form.invoice_number}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Customer</Label>
                    <Select
                      value={form.customer_id}
                      onValueChange={(v) => setForm({ ...form, customer_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
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
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Issue date</Label>
                    <Input
                      type="date"
                      value={form.issue_date}
                      onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} disabled={s === "paid" || s === "partial"}>
                            {s === "paid"
                              ? "paid (record a payment to settle)"
                              : s === "partial"
                                ? "partial (calculated from payments)"
                                : s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Currency</Label>
                  <CurrencySelect
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  />
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line items</Label>
                    <div className="flex gap-2">
                      <Select value="" onValueChange={addCatalog}>
                        <SelectTrigger className="w-48 h-8">
                          <SelectValue placeholder="+ Add from catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No products/services yet
                            </div>
                          )}
                          {catalog.map((c) => {
                            const stockLabel =
                              c.type === "product" && c.track_inventory
                                ? ` · stock: ${Number(c.stock_quantity ?? 0)}`
                                : "";
                            return (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} — {fmt(c.price, form.currency)}
                                {stockLabel}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" variant="outline" onClick={addBlank}>
                        + Blank
                      </Button>
                    </div>
                  </div>

                  {lines.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Add a product or service to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lines.map((l, i) => {
                        const amount = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
                        const cat = l.item_id ? catalog.find((c) => c.id === l.item_id) : null;
                        const tracks = cat?.type === "product" && cat.track_inventory;
                        const stock = tracks ? Number(cat!.stock_quantity ?? 0) : null;
                        const over = stock !== null && Number(l.quantity) > stock;
                        return (
                          <div key={i} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-5">
                              <Input
                                placeholder="Description"
                                value={l.description}
                                onChange={(e) => updateLine(i, { description: e.target.value })}
                              />
                              {stock !== null && (
                                <div
                                  className={`text-[11px] mt-0.5 ${over ? "text-rose-600" : "text-muted-foreground"}`}
                                >
                                  Stock: {stock}
                                  {over ? ` — insufficient (need ${l.quantity})` : ""}
                                </div>
                              )}
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={l.quantity}
                                onChange={(e) =>
                                  updateLine(i, { quantity: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={l.unit_price}
                                onChange={(e) =>
                                  updateLine(i, { unit_price: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={l.tax_rate}
                                onChange={(e) =>
                                  updateLine(i, { tax_rate: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="col-span-2 text-right text-sm tabular-nums">
                              {fmt(amount + amount * (l.tax_rate / 100), form.currency)}
                            </div>
                            <div className="col-span-1 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLine(i)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground pt-1 border-t">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-1">Qty</div>
                        <div className="col-span-2">Unit price</div>
                        <div className="col-span-1">Tax %</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-1"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{fmt(totals.subtotal, form.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="tabular-nums">{fmt(totals.tax, form.currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t pt-1">
                      <span>Total</span>
                      <span className="tabular-nums">{fmt(totals.total, form.currency)}</span>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-hero">
                  Save invoice
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {weeklyUsage && weeklyUsage.limit !== null && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2 text-sm">
          <span>
            <span className="font-medium">{weeklyUsage.used}</span> / {weeklyUsage.limit} invoices
            used this week (free plan)
          </span>
          {weeklyUsage.used >= weeklyUsage.limit * 0.75 && (
            <Button size="sm" variant="outline" onClick={() => setUpgradeOpen(true)}>
              Upgrade for unlimited
            </Button>
          )}
        </div>
      )}
      <UpgradePlanModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={plan as PlanKey}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="invoice-contact-filter">Contact filter</Label>
          <Select value={contactFilter} onValueChange={setContactFilter}>
            <SelectTrigger id="invoice-contact-filter" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All invoices</SelectItem>
              <SelectItem value="silent-7">No contact in 7+ days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Silence applies to sent, partly paid and overdue invoices.
        </p>
      </div>
      <div className="bg-card border rounded-xl overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No invoices yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last contact</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setSortBySilence((v) => !v)}
                    title="Sort by days silent"
                  >
                    Days silent {sortBySilence ? "↓" : "↕"}
                  </button>
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...items]
                .filter(
                  (i) =>
                    contactFilter !== "silent-7" ||
                    (getDaysSilent(i.status, lastContactAtByInvoice[i.id], i.sent_at) ?? -1) >= 7,
                )
                .sort((a, b) =>
                  sortBySilence
                    ? (getDaysSilent(b.status, lastContactAtByInvoice[b.id], b.sent_at) ?? -1) -
                      (getDaysSilent(a.status, lastContactAtByInvoice[a.id], a.sent_at) ?? -1)
                    : 0,
                )
                .map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>{i.customers?.name ?? "—"}</TableCell>
                  <TableCell>{i.issue_date}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === "paid" ? "default" : "secondary"}>
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {lastContactAtByInvoice[i.id]
                        ? new Date(lastContactAtByInvoice[i.id]).toLocaleDateString()
                        : "Never"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeContact(lastContactAtByInvoice[i.id])}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const days = getDaysSilent(
                        i.status,
                        lastContactAtByInvoice[i.id],
                        i.sent_at,
                      );
                      return days === null ? (
                        "—"
                      ) : (
                        <Badge variant={days >= 7 ? "destructive" : "outline"}>
                          {days} {days === 1 ? "day" : "days"}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">{fmt(Number(i.total), i.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openFollowups(i)}
                      title="View and log follow-ups"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShareDialogInvoice(i)}
                      title="Manage invoice sharing link"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => sendInvoiceEmail(i)}
                      disabled={sendingId === i.id}
                      title={
                        i.sent_at
                          ? `Sent ${new Date(i.sent_at).toLocaleDateString()} — resend`
                          : "Send invoice by email"
                      }
                    >
                      {sendingId === i.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : i.sent_at ? (
                        <MailCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadPdf(i)}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={Boolean(shareDialogInvoice)}
        onOpenChange={(open) => {
          if (!open) setShareDialogInvoice(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice sharing link</DialogTitle>
          </DialogHeader>
          {shareDialogInvoice && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="font-medium">{shareDialogInvoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  {isShareLinkActive(shareDialogInvoice)
                    ? "This link is active."
                    : "This link is revoked or expired."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shareDialogInvoice.share_token_expires_at
                    ? `Expires ${new Date(shareDialogInvoice.share_token_expires_at).toLocaleString()}`
                    : "Existing link has no expiry until you regenerate it."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={copyInvoiceShareLink}
                  disabled={!isShareLinkActive(shareDialogInvoice)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy active link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateInvoiceShareLink("regenerate")}
                  disabled={shareActionBusy}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate new link
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => updateInvoiceShareLink("revoke")}
                  disabled={shareActionBusy || !isShareLinkActive(shareDialogInvoice)}
                >
                  <Link2Off className="mr-2 h-4 w-4" />
                  Revoke link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generating a new link immediately invalidates the previous link. Existing customer
                links remain unchanged until you revoke or regenerate them.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(followupInvoice)}
        onOpenChange={(v) => {
          if (!v) setFollowupInvoice(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Follow-up history
              {followupInvoice ? ` · ${followupInvoice.invoice_number}` : ""}
            </DialogTitle>
          </DialogHeader>
          {followupInvoice && (
            <div className="space-y-5">
              {canEditInvoices && (
                <form onSubmit={saveFollowup} className="space-y-3 rounded-lg border p-3">
                  <div className="font-medium text-sm">Log follow-up</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="followup-date">Contact date and time</Label>
                      <Input
                        id="followup-date"
                        type="datetime-local"
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Channel</Label>
                      <Select
                        value={followupChannel}
                        onValueChange={(v) => setFollowupChannel(v as InvoiceContactChannel)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="in_person">In person</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="followup-note">Note (optional)</Label>
                    <Input
                      id="followup-note"
                      maxLength={500}
                      placeholder="Brief summary of the conversation"
                      value={followupNote}
                      onChange={(e) => setFollowupNote(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={followupSaving}>
                    {followupSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save follow-up
                  </Button>
                </form>
              )}
              <section className="space-y-3">
                <div className="font-medium text-sm">History</div>
                {followupsLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Loading history…
                  </div>
                ) : followups.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No follow-ups recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followups.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium text-sm">
                            {entry.channel === "in_person"
                              ? "In person"
                              : entry.channel === "whatsapp"
                                ? "WhatsApp"
                                : entry.channel === "sms"
                                  ? "SMS"
                                  : entry.channel.charAt(0).toUpperCase() +
                                    entry.channel.slice(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.contacted_at).toLocaleString()}
                          </div>
                          {entry.note && (
                            <p className="text-sm break-words">{entry.note}</p>
                          )}
                        </div>
                        {canEditInvoices && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Delete follow-up"
                            onClick={() => deleteFollowup(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
