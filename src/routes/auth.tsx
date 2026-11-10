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

function getSafeNextPath(value?: string): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  // Never allow a return path to bypass account setup or create an auth loop.
  if (value === "/auth" || value.startsWith("/auth?") || value === "/onboarding" || value.startsWith("/onboarding?")) {
    return null;
  }
  return value;
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  useEffect(() => {
    let cancelled = false;
    async function redirectSignedInUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user || cancelled) return;

        // Always enforce verification/onboarding before honoring a return path.
        const target = await resolveNextRoute(data.user);
        if (cancelled) return;
        if (target.to !== "/dashboard" && target.to !== "/onboarding") {
          navigate({ ...(target as any), replace: true });
          return;
        }

        const safeNext = getSafeNextPath(next);
        navigate({ ...(safeNext ? { to: safeNext } : (target as any)), replace: true } as any);
      } catch (error) {
        console.error("[auth] Could not resolve signed-in destination:", error);
        toast.error("We couldn't load your account. Please refresh and try again.");
      }
    }
    void redirectSignedInUser();
    return () => {
      cancelled = true;
    };
  }, [navigate, next]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Supabase returns to this route after Google authentication.
          // The existing signed-in redirect then enforces verification and onboarding.
          redirectTo: `${window.location.origin}/auth?mode=${mode}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("[auth] Google OAuth failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't continue with Google. Please try again.");
      setGoogleLoading(false);
    }
  }

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
        const target = await resolveNextRoute(data.user);
        if (target.to !== "/dashboard" && target.to !== "/onboarding") {
          navigate({ ...(target as any), replace: true });
        } else {
          const safeNext = getSafeNextPath(next);
          navigate({ ...(safeNext ? { to: safeNext } : (target as any)), replace: true } as any);
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
          <Button
            type="button"
            variant="outline"
            disabled={loading || googleLoading}
            onClick={handleGoogleSignIn}
            className="mb-5 h-11 w-full gap-3"
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 5)" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.47-4.72 7.16l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.54Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" transform="translate(0 0)" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.91l-7.62-5.91c-2.11 1.42-4.81 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
            )}
            {googleLoading ? "Connecting to Google…" : `Continue with Google`}
          </Button>
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">Or continue with email</span></div>
          </div>
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
