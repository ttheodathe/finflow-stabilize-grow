import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — FinFlow Track" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please sign in with your new password.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { mode: "login" }, replace: true });
    } catch (error) {
      console.error("[auth] Password update failed:", error);
      setErrorMessage(
        "This reset link may have expired or already been used. Request a new password reset link and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4 py-8">
      <form
        onSubmit={handle}
        className="w-full max-w-md bg-card border rounded-2xl shadow-elevated p-5 sm:p-8 space-y-4"
      >
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password with at least 12 characters.
        </p>
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className="h-11"
          />
        </div>
        {errorMessage && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage}
            <a href="/forgot-password" className="ml-1 underline underline-offset-2">
              Request another link
            </a>
          </div>
        )}
        <Button type="submit" disabled={loading || password.length < 12} className="w-full bg-gradient-hero">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
