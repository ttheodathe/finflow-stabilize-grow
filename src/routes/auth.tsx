import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resolveNextRoute } from "@/lib/auth-flow";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
  plan: z.enum(["free", "starter", "pro", "business", "enterprise"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Free Accounting" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, plan, next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      if (next) {
        navigate({ to: next as any });
        return;
      }
      const target = await resolveNextRoute(data.user);
      navigate(target as any);
    });
  }, [navigate, next]);

  // Persist plan chosen on Pricing across signup so onboarding picks it up.
  useEffect(() => {
    if (plan && typeof window !== "undefined") {
      localStorage.setItem("pendingPlan", plan);
    }
  }, [plan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name: fullName, plan: plan ?? "free" },
          },
        });
        if (error) throw error;
        // If Supabase requires email confirmation there is no session yet.
        if (!data.session) {
          toast.success("Account created — check your email to verify.");
          navigate({ to: "/verify-email", search: { email } });
          return;
        }
        toast.success("Account created!");
        navigate({ to: "/onboarding" });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        if (next) {
          navigate({ to: next as any });
        } else {
          const target = await resolveNextRoute(data.user);
          navigate(target as any);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 text-2xl font-bold gradient-text">
          Free Accounting
        </Link>
        <div className="bg-card border rounded-2xl shadow-elevated p-8">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login"
              ? "Sign in to your free account."
              : "Free forever. No credit card required."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-hero shadow-glow"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline"
            >
              {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
            </button>
            {mode === "login" && (
              <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
