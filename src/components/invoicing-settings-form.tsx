import { useState } from "react";
import type { WorkspaceSettings } from "../../hooks/useSettings";

interface Props {
  settings: WorkspaceSettings;
  saving: boolean;
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<{ success: boolean; error?: string }>;
}

export function InvoicingSettingsForm({ settings, saving, onSave }: Props) {
  const [form, setForm] = useState({
    invoicePrefix: settings.invoicePrefix,
    invoiceNextNumber: settings.invoiceNextNumber,
    defaultPaymentTermsDays: settings.defaultPaymentTermsDays,
    defaultInvoiceNotes: settings.defaultInvoiceNotes ?? "",
  });
  const [savedJustNow, setSavedJustNow] = useState(false);

  const isDirty =
    form.invoicePrefix !== settings.invoicePrefix ||
    form.invoiceNextNumber !== settings.invoiceNextNumber ||
    form.defaultPaymentTermsDays !== settings.defaultPaymentTermsDays ||
    form.defaultInvoiceNotes !== (settings.defaultInvoiceNotes ?? "");

  async function handleSave() {
    const result = await onSave({
      ...form,
      defaultInvoiceNotes: form.defaultInvoiceNotes || null,
    });
    if (result.success) {
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Invoice prefix">
          <input
            type="text"
            value={form.invoicePrefix}
            onChange={(e) => setForm((f) => ({ ...f, invoicePrefix: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Next invoice number">
          <input
            type="number"
            min={1}
            value={form.invoiceNextNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, invoiceNextNumber: Number(e.target.value) || 1 }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <p className="text-xs text-gray-500 -mt-3">
        Next invoice will be numbered{" "}
        <span className="font-mono">
          {form.invoicePrefix}
          {form.invoiceNextNumber}
        </span>
        .
      </p>

      <Field label="Default payment terms (days)">
        <input
          type="number"
          min={0}
          value={form.defaultPaymentTermsDays}
          onChange={(e) =>
            setForm((f) => ({ ...f, defaultPaymentTermsDays: Number(e.target.value) || 0 }))
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Default invoice notes">
        <textarea
          rows={3}
          value={form.defaultInvoiceNotes}
          onChange={(e) => setForm((f) => ({ ...f, defaultInvoiceNotes: e.target.value }))}
          placeholder="e.g. Thank you for your business!"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedJustNow && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
