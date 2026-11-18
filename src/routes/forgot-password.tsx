import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — FinFlow Track" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      // Supabase intentionally returns the same result for known and unknown
      // addresses. Keep the UI neutral to avoid account enumeration.
      setSent(true);
      toast.success("If an account matches that address, a reset link will be sent.");
    } catch (error) {
      console.error("[auth] Password recovery request failed:", error);
      setErrorMessage(
        "We couldn't process that request right now. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4 py-8">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-elevated p-5 sm:p-8">
        <h1 className="text-2xl font-bold mb-2">Reset password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your account email. If it matches an account, we'll send a secure link to set a new password.
        </p>
        {sent ? (
          <div role="status" aria-live="polite" className="rounded-lg border bg-muted/30 p-4 text-sm">
            If an account matches <strong>{email}</strong>, a reset link will arrive shortly. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={handle} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-hero">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <div className="mt-4 text-sm text-center">
          <Link to="/auth" search={{ mode: "login" }} className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
