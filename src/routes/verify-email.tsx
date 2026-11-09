import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MailCheck, Loader2 } from "lucide-react";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  ssr: false,
  head: () => ({ meta: [{ title: "Verify your email — FinFlow Track" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Poll for verification and route forward once confirmed.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user?.email_confirmed_at) {
        navigate({ to: "/onboarding" });
      }
    }
    check();
    const interval = setInterval(check, 6000);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void check();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function resend() {
    if (!email || resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendCooldown(60);
      toast.success("Verification email sent. You can request another in 60 seconds.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't resend the verification email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center bg-card border rounded-2xl shadow-elevated p-5 sm:p-8">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check your inbox</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {email
            ? `We sent a verification link to ${email}.`
            : "We sent you a verification link."}{" "}
          Click it to activate your account. This page will continue automatically once verified.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
          <Loader2 className="h-3 w-3 animate-spin" /> Waiting for verification…
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={resend} disabled={resending || resendCooldown > 0 || !email} variant="outline">
            {resending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
          </Button>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}