import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface CreateCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new company's id after a successful create, so the
   * caller (AppSidebar) can refresh its list and switch to it. */
  onCreated: (companyId: string) => void;
}

// Fixed empty shape. This form NEVER reads from any "current company" state —
// that's what makes it structurally impossible for it to repeat the old bug.
const EMPTY = { name: "", email: "", currency: "USD", address: "", phone: "" };

export function CreateCompanyModal({ open, onOpenChange, onCreated }: CreateCompanyModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setForm(EMPTY);
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_company", {
      p_name: form.name.trim(),
      p_email: form.email.trim() || null,
      p_currency: form.currency || "USD",
      p_address: form.address.trim() || null,
      p_phone: form.phone.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      if (error.message?.includes("company_limit_reached")) {
        toast.error("Company limit reached", {
          description: "Your current plan doesn't allow any more companies. Upgrade to add another.",
        });
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(`${(data as any).name} created`);
    onCreated((data as any).id);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : reset())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Company name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Career Lift Global"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={form.currency}
                maxLength={3}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
