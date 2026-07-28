import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TaxSetting, TaxFilingFrequency } from "@/types/tax.types";
import type { UpsertTaxSettingInput } from "@/services/tax/taxSettings.service";

const EMPTY_FORM = {
  name: "",
  rate: 0,
  isInclusive: false,
  isDefault: false,
  isActive: true,
  taxNumber: "",
  jurisdiction: "",
  authorityName: "",
  filingFrequency: "monthly" as TaxFilingFrequency,
};

export function TaxRatesEditor({
  companyId,
  settings,
  isLoading,
  onSave,
  onDelete,
  canManage,
}: {
  companyId: string;
  settings: TaxSetting[];
  isLoading: boolean;
  onSave: (input: UpsertTaxSettingInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxSetting | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(setting: TaxSetting) {
    setEditing(setting);
    setForm({
      name: setting.name,
      rate: setting.rate,
      isInclusive: setting.is_inclusive,
      isDefault: setting.is_default,
      isActive: setting.is_active,
      taxNumber: setting.tax_number ?? "",
      jurisdiction: setting.jurisdiction ?? "",
      authorityName: setting.authority_name ?? "",
      filingFrequency: setting.filing_frequency,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editing?.id,
        companyId,
        name: form.name,
        rate: Number(form.rate),
        isInclusive: form.isInclusive,
        isDefault: form.isDefault,
        isActive: form.isActive,
        taxNumber: form.taxNumber || null,
        jurisdiction: form.jurisdiction || null,
        authorityName: form.authorityName || null,
        filingFrequency: form.filingFrequency,
      });
      toast.success(editing ? "Tax setting updated" : "Tax setting created");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save tax setting");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tax setting? This cannot be undone.")) return;
    try {
      await onDelete(id);
      toast.success("Tax setting deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax setting");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Tax rates & jurisdictions</h3>
          <p className="text-sm text-muted-foreground">
            Configure the tax rates this company files under.
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add tax rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit tax rate" : "New tax rate"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. VAT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rate}
                      onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jurisdiction</Label>
                    <Input
                      value={form.jurisdiction}
                      onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                      placeholder="e.g. RW"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Authority</Label>
                    <Input
                      value={form.authorityName}
                      onChange={(e) => setForm((f) => ({ ...f, authorityName: e.target.value }))}
                      placeholder="e.g. Rwanda Revenue Authority"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax number</Label>
                    <Input
                      value={form.taxNumber}
                      onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Filing frequency</Label>
                    <Select
                      value={form.filingFrequency}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, filingFrequency: v as TaxFilingFrequency }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Tax-inclusive pricing</Label>
                    <p className="text-xs text-muted-foreground">
                      Line amounts already include this tax
                    </p>
                  </div>
                  <Switch
                    checked={form.isInclusive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isInclusive: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Default rate</Label>
                    <p className="text-xs text-muted-foreground">Used when none is specified</p>
                  </div>
                  <Switch
                    checked={form.isDefault}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive rates are hidden from new filings
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : settings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tax rates configured yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {s.name}{" "}
                  {s.is_default && (
                    <Badge variant="secondary" className="ml-2">
                      Default
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{s.rate}%</TableCell>
                <TableCell>{s.jurisdiction ?? "—"}</TableCell>
                <TableCell className="capitalize">{s.filing_frequency}</TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? "outline" : "secondary"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
