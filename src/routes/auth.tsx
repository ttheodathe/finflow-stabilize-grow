import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  head: ({ match }) => ({
    meta: [
      {
        title:
          match.search?.mode === "signup"
            ? "Create your account | FinFlowTrack"
            : "Sign in | FinFlowTrack",
      },
      // Account pages have no value in search results.
      { name: "robots", content: "noindex, follow" },
    ],
  }),
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 text-2xl font-bold gradient-text">
          FINFLOW TRACK
        </Link>
        <div className="bg-card border rounded-2xl shadow-elevated p-5 sm:p-8">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login"
              ? "Sign in to your account."
              : "Free plan available. No credit card needed to sign up."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-hero shadow-glow"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
            {mode === "signup" && (
              <p className="text-center text-xs text-muted-foreground">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </form>
          <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                const nextMode = mode === "login" ? "signup" : "login";
                setMode(nextMode);
                navigate({
                  to: "/auth",
                  search: {
                    mode: nextMode,
                    ...(plan ? { plan } : {}),
                    ...(next ? { next } : {}),
                  },
                  replace: true,
                });
              }}
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
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          FinFlowTrack is operated by 2005CLG Ltd, a company registered in Rwanda.{" "}
          <Link to="/about" className="underline underline-offset-2 hover:text-foreground">
            About us
          </Link>
          {" · "}
          <Link to="/security" className="underline underline-offset-2 hover:text-foreground">
            Security
          </Link>
          {" · "}
          <Link to="/contact" className="underline underline-offset-2 hover:text-foreground">
            Contact
          </Link>
          <br />
          Need help?{" "}
          <a
            href="mailto:support@finflowtrack.com"
            className="underline underline-offset-2 hover:text-foreground"
          >
            support@finflowtrack.com
          </a>
        </p>
      </div>
    </div>
  );
}
