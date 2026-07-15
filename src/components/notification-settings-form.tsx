import type { WorkspaceSettings } from "../../hooks/useSettings";

interface Props {
  settings: WorkspaceSettings;
  saving: boolean;
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<{ success: boolean; error?: string }>;
}

const TOGGLES: {
  key: keyof Pick<
    WorkspaceSettings,
    "notifyPaymentReceived" | "notifyInvoiceOverdue" | "notifyWeeklySummary"
  >;
  label: string;
  description: string;
}[] = [
  {
    key: "notifyPaymentReceived",
    label: "Payment received",
    description: "Get an email when a client pays an invoice.",
  },
  {
    key: "notifyInvoiceOverdue",
    label: "Invoice overdue",
    description: "Get an email when an invoice passes its due date unpaid.",
  },
  {
    key: "notifyWeeklySummary",
    label: "Weekly summary",
    description: "A weekly digest of invoices sent, paid, and outstanding.",
  },
];

export function NotificationSettingsForm({ settings, saving, onSave }: Props) {
  return (
    <div className="space-y-1">
      {TOGGLES.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={toggle.label}
          description={toggle.description}
          checked={settings[toggle.key]}
          disabled={saving}
          onChange={(checked) => onSave({ [toggle.key]: checked })}
        />
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="pr-4">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
          checked ? "bg-gray-900" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
