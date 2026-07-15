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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";

export const Route = createFileRoute("/_authenticated/accounting/journals")({
  head: () => ({ meta: [{ title: "Journal entries — Free Accounting" }] }),
  component: JournalsPage,
});

type Account = { id: string; code: string; name: string; is_active: boolean };
type Entry = {
  id: string;
  entry_date: string;
  reference: string | null;
  memo: string | null;
  source_type: string | null;
  journal_lines: {
    id: string;
    account_id: string;
    debit: number;
    credit: number;
    description: string | null;
    accounts: { code: string; name: string } | null;
  }[];
};

function JournalsPage() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [entRes, accRes] = await Promise.all([
      supabase
        .from("journal_entries")
        .select(
          "id,entry_date,reference,memo,source_type,journal_lines(id,account_id,debit,credit,description,accounts(code,name))",
        )
        .order("entry_date", { ascending: false })
        .limit(200),
      supabase
        .from("accounts")
        .select("id,code,name,is_active")
        .eq("is_active", true)
        .order("code"),
    ]);
    if (entRes.error) toast.error(entRes.error.message);
    setEntries((entRes.data ?? []) as unknown as Entry[]);
    setAccounts((accRes.data ?? []) as Account[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function del(id: string) {
    if (!confirm("Delete this journal entry?")) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Journal entries</h1>
          <p className="text-muted-foreground">
            Post manual journal entries. Debits must equal credits.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New entry
            </Button>
          </DialogTrigger>
          <NewEntryDialog
            accounts={accounts}
            onSaved={() => {
              setOpen(false);
              load();
            }}
          />
        </Dialog>
      </div>
      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {entries.length === 0 && (
            <div className="text-muted-foreground text-sm">No entries yet.</div>
          )}
          {entries.map((e) => {
            const total = e.journal_lines.reduce((s, l) => s + Number(l.debit), 0);
            return (
              <div key={e.id} className="bg-card border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-baseline gap-3">
                    <span className="font-semibold">{e.entry_date}</span>
                    {e.reference && (
                      <span className="text-sm text-muted-foreground">{e.reference}</span>
                    )}
                    {e.source_type && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">{e.source_type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{fmt(total)}</span>
                    <Button size="icon" variant="ghost" onClick={() => del(e.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {e.memo && (
                  <div className="px-4 py-2 text-sm text-muted-foreground border-b">{e.memo}</div>
                )}
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Account</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-right w-32">Debit</th>
                      <th className="px-4 py-2 text-right w-32">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.journal_lines.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="px-4 py-2 font-mono">
                          {l.accounts?.code} — {l.accounts?.name}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{l.description}</td>
                        <td className="px-4 py-2 text-right">
                          {Number(l.debit) ? fmt(Number(l.debit)) : ""}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {Number(l.credit) ? fmt(Number(l.credit)) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LineDraft = { account_id: string; debit: string; credit: string; description: string };

function NewEntryDialog({ accounts, onSaved }: { accounts: Account[]; onSaved: () => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { account_id: "", debit: "", credit: "", description: "" },
    { account_id: "", debit: "", credit: "", description: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const c = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { d, c, balanced: Math.round(d * 100) === Math.round(c * 100) && d > 0 };
  }, [lines]);

  function updateLine(i: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((p) => [...p, { account_id: "", debit: "", credit: "", description: "" }]);
  }
  function removeLine(i: number) {
    setLines((p) => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!totals.balanced) {
      toast.error("Debits must equal credits and be greater than zero");
      return;
    }
    const valid = lines.filter(
      (l) => l.account_id && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0),
    );
    if (valid.length < 2) {
      toast.error("Add at least two lines");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      setSaving(false);
      return;
    }
    const { data: entry, error: e1 } = await supabase
      .from("journal_entries")
      .insert({
        user_id: uid,
        entry_date: date,
        reference: reference || null,
        memo: memo || null,
        source_type: "manual",
      })
      .select("id")
      .single();
    if (e1 || !entry) {
      setSaving(false);
      toast.error(e1?.message ?? "Failed");
      return;
    }
    const payload = valid.map((l) => ({
      user_id: uid,
      entry_id: entry.id,
      account_id: l.account_id,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      description: l.description || null,
    }));
    const { error: e2 } = await supabase.from("journal_lines").insert(payload);
    setSaving(false);
    if (e2) {
      await supabase.from("journal_entries").delete().eq("id", entry.id);
      toast.error(e2.message);
    } else {
      toast.success("Entry posted");
      onSaved();
    }
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>New journal entry</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Reference</Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. JE-001"
          />
        </div>
      </div>
      <div>
        <Label>Memo</Label>
        <Textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">Account</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 w-28">Debit</th>
              <th className="px-2 py-2 w-28">Credit</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1">
                  <Select
                    value={l.account_id}
                    onValueChange={(v) => updateLine(i, { account_id: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1">
                  <Input
                    value={l.description}
                    onChange={(e) => updateLine(i, { description: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={l.debit}
                    onChange={(e) =>
                      updateLine(i, {
                        debit: e.target.value,
                        credit: e.target.value ? "" : l.credit,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={l.credit}
                    onChange={(e) =>
                      updateLine(i, {
                        credit: e.target.value,
                        debit: e.target.value ? "" : l.debit,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30">
            <tr>
              <td colSpan={2} className="px-2 py-2 text-right font-medium">
                Totals
              </td>
              <td className="px-2 py-2 text-right font-mono">{totals.d.toFixed(2)}</td>
              <td className="px-2 py-2 text-right font-mono">{totals.c.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="w-4 h-4 mr-1" />
          Add line
        </Button>
        <div
          className={"text-sm " + (totals.balanced ? "text-green-600" : "text-muted-foreground")}
        >
          {totals.balanced ? "Balanced" : `Out of balance: ${(totals.d - totals.c).toFixed(2)}`}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !totals.balanced}>
          {saving ? "Posting…" : "Post entry"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
