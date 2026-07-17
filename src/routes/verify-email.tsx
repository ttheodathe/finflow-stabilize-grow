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
    const interval = setInterval(check, 4000);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") check();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function resend() {
    if (!email) {
      toast.error("No email on file to resend to.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent.");
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center bg-card border rounded-2xl shadow-elevated p-10">
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
          <Button onClick={resend} disabled={resending} variant="outline">
            {resending ? "Sending…" : "Resend verification email"}
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