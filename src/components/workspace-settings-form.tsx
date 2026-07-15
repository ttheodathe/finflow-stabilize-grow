import { useState } from "react";
import type { WorkspaceSettings } from "../../hooks/useSettings";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "NGN", "ZAR", "KES"];
const DATE_FORMATS: WorkspaceSettings["dateFormat"][] = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

// A trimmed-down list is safer than Intl.supportedValuesOf("timeZone") for
// older browsers. Swap for the full IANA list if you don't need to support them.
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Kigali",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

interface Props {
  settings: WorkspaceSettings;
  saving: boolean;
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<{ success: boolean; error?: string }>;
}

export function WorkspaceSettingsForm({ settings, saving, onSave }: Props) {
  const [form, setForm] = useState({
    workspaceName: settings.workspaceName,
    currency: settings.currency,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
  });
  const [savedJustNow, setSavedJustNow] = useState(false);

  const isDirty =
    form.workspaceName !== settings.workspaceName ||
    form.currency !== settings.currency ||
    form.timezone !== settings.timezone ||
    form.dateFormat !== settings.dateFormat;

  async function handleSave() {
    const result = await onSave(form);
    if (result.success) {
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <Field label="Workspace name">
        <input
          type="text"
          value={form.workspaceName}
          onChange={(e) => setForm((f) => ({ ...f, workspaceName: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Default currency">
        <select
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Timezone">
        <select
          value={form.timezone}
          onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date format">
        <select
          value={form.dateFormat}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              dateFormat: e.target.value as WorkspaceSettings["dateFormat"],
            }))
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {DATE_FORMATS.map((df) => (
            <option key={df} value={df}>
              {df}
            </option>
          ))}
        </select>
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
