import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookmark, Trash2 } from "lucide-react";
import { ReportKey, useReportPresets } from "@/hooks/useReportPresets";

/**
 * Save/load/delete filter presets for a single report tab. Purely additive
 * UI — the parent report owns its own filter state and passes it in as
 * `currentConfig`; this component only reads/writes report_view_presets.
 */
export function ReportPresetBar<TConfig extends Record<string, unknown>>({
  reportKey,
  currentConfig,
  onApply,
}: {
  reportKey: ReportKey;
  currentConfig: TConfig;
  onApply: (config: TConfig) => void;
}) {
  const { presets, save, remove } = useReportPresets<TConfig>(reportKey);
  const [selectedId, setSelectedId] = useState<string>("");
  const [newName, setNewName] = useState("");

  function handleLoad(id: string) {
    setSelectedId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) onApply(preset.config);
  }

  async function handleSave() {
    const name = newName.trim();
    if (!name) return;
    await save(name, currentConfig);
    setNewName("");
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm("Delete this saved view?")) return;
    await remove(selectedId);
    setSelectedId("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {presets.length > 0 && (
        <div className="flex items-center gap-1">
          <Select value={selectedId} onValueChange={handleLoad}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Saved views" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedId && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name this view…"
          className="h-8 w-36"
        />
        <Button variant="outline" size="sm" className="h-8" onClick={handleSave} disabled={!newName.trim()}>
          <Bookmark className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}
