import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useTaxDeadlines } from "@/hooks/useTaxDeadlines";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { usePermissions } from "@/hooks/usePermissions";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { UpcomingDeadlines } from "@/components/tax/UpcomingDeadlines";

export const Route = createFileRoute("/_authenticated/tax/calendar")({
  head: () => ({ meta: [{ title: "Tax Calendar — Finflow Track" }] }),
  component: TaxCalendarPage,
});

function TaxCalendarPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const { can } = usePermissions(companyId);
  const { deadlines, isLoading, createDeadline, completeDeadline } = useTaxDeadlines(companyId);
  const { settings } = useTaxSettings(companyId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !dueDate) {
      toast.error("Title and due date are required");
      return;
    }
    setSaving(true);
    try {
      const defaultSetting = settings.find((s) => s.is_default) ?? settings[0];
      await createDeadline({
        companyId,
        title,
        taxType: defaultSetting?.name ?? "tax",
        dueDate,
        taxSettingId: defaultSetting?.id ?? null,
      });
      toast.success("Deadline added");
      setOpen(false);
      setTitle("");
      setDueDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add deadline");
    } finally {
      setSaving(false);
    }
  }

  if (!companyId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tax calendar</h1>
          <p className="text-sm text-muted-foreground">Never miss a filing or payment deadline.</p>
        </div>

        {can("tax.manage_settings") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add deadline
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a tax deadline</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 VAT filing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Add deadline"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <UpcomingDeadlines
        deadlines={deadlines}
        isLoading={isLoading}
        onComplete={(id) => completeDeadline({ id })}
      />
    </div>
  );
}
