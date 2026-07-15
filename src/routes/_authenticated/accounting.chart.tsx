import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Power, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounting/chart")({
  head: () => ({ meta: [{ title: "Chart of accounts — Free Accounting" }] }),
  component: ChartPage,
});

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
};

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};
const TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

function ChartPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    // Seed if empty
    const { count } = await supabase.from("accounts").select("*", { count: "exact", head: true });
    if (!count) {
      await supabase.rpc("seed_default_accounts", { _user_id: uid });
    }
    const { data, error } = await supabase.from("accounts").select("*").order("code");
    if (error) toast.error(error.message);
    else setAccounts((data ?? []) as Account[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<AccountType, Account[]> = {
      asset: [],
      liability: [],
      equity: [],
      revenue: [],
      expense: [],
    };
    accounts.forEach((a) => g[a.type].push(a));
    return g;
  }, [accounts]);

  async function toggleActive(a: Account) {
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else {
      toast.success(a.is_active ? "Deactivated" : "Activated");
      load();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Chart of accounts</h1>
          <p className="text-muted-foreground">Double-entry chart of accounts for your business.</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4 mr-2" />
              New account
            </Button>
          </DialogTrigger>
          <AccountDialog
            editing={editing}
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
        <div className="space-y-8">
          {TYPE_ORDER.map((t) => (
            <div key={t}>
              <h2 className="text-lg font-semibold mb-3">{TYPE_LABELS[t]}</h2>
              <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left w-24">Code</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 w-24">Status</th>
                      <th className="px-4 py-2 w-32 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[t].length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-muted-foreground text-sm"
                        >
                          No accounts
                        </td>
                      </tr>
                    )}
                    {grouped[t].map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-4 py-2 font-mono text-sm">{a.code}</td>
                        <td className="px-4 py-2">
                          {a.name}
                          {a.is_system && (
                            <span className="ml-2 text-xs text-muted-foreground">system</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{a.description}</td>
                        <td className="px-4 py-2">
                          {a.is_active ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(a);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(a)}>
                            <Power className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountDialog({ editing, onSaved }: { editing: Account | null; onSaved: () => void }) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<AccountType>(editing?.type ?? "asset");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setType(editing?.type ?? "asset");
    setDescription(editing?.description ?? "");
  }, [editing]);

  async function save() {
    if (!code.trim() || !name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      setSaving(false);
      return;
    }
    const payload = {
      code: code.trim(),
      name: name.trim(),
      type,
      description: description || null,
    };
    const { error } = editing
      ? await supabase.from("accounts").update(payload).eq("id", editing.id)
      : await supabase.from("accounts").insert({ ...payload, user_id: uid });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "Account updated" : "Account created");
      onSaved();
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 6150" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
