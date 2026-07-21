import type { WorkspaceSettings as Settings } from "@/hooks/useSettings";
import { BillingSettings } from "./BillingSettings";

interface UpgradeSettingsFormProps {
  settings: Settings;
  saving: boolean;
  onSave: (patch: Partial<Settings>) => void;
}

/**
 * Legacy alias. Billing is now handled by <BillingSettings /> using Paddle.
 * Kept as a thin wrapper so existing tab wiring in <SettingsPage /> keeps working.
 */
export function UpgradeSettingsForm(_: UpgradeSettingsFormProps) {
  return <BillingSettings />;
}
