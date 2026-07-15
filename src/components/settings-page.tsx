import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSettings } from "@/hooks/useSettings";
import { WorkspaceSettingsForm } from "./workspace-settings-form";
import { InvoicingSettingsForm } from "./invoicing-settings-form";
import { NotificationSettingsForm } from "./notification-settings-form";
import { UpgradeSettingsForm } from "./upgrade-settings-form";

interface SettingsPageProps {
  supabase: SupabaseClient;
  userId: string;
}

type Tab = "workspace" | "invoicing" | "notifications" | "upgrade";

const TABS: { id: Tab; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "invoicing", label: "Invoicing" },
  { id: "notifications", label: "Notifications" },
  { id: "upgrade", label: "Upgrade" },
];

export function SettingsPage({ supabase, userId }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("workspace");
  const { loading, saving, error, settings, updateSettings } = useSettings(supabase, userId);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading settings…</div>;
  }
  if (error && !settings) {
    return <div className="p-6 text-sm text-red-600">Couldn't load settings: {error}</div>;
  }
  if (!settings) {
    return <div className="p-6 text-sm text-gray-500">No settings found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      <div className="mt-4 border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="mt-6">
        {activeTab === "workspace" && (
          <WorkspaceSettingsForm settings={settings} saving={saving} onSave={updateSettings} />
        )}
        {activeTab === "invoicing" && (
          <InvoicingSettingsForm settings={settings} saving={saving} onSave={updateSettings} />
        )}
        {activeTab === "notifications" && (
          <NotificationSettingsForm settings={settings} saving={saving} onSave={updateSettings} />
        )}
        {activeTab === "upgrade" && (
          <UpgradeSettingsForm settings={settings} saving={saving} onSave={updateSettings} />
        )}
      </div>
    </div>
  );
}
