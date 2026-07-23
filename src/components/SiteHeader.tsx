import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { label: "Features", to: "/features" as const },
  { label: "Pricing", to: "/pricing" as const },
  { label: "AI", to: "/" as const, hash: "ai" },
  { label: "Reviews", to: "/testimonials" as const },
];

/**
 * Site-wide top navigation. Sticky to the top of the viewport (`sticky
 * top-0 z-50`) so it stays pinned while the page scrolls. Import this into
 * any route's component to give that page the same nav as the homepage.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <Wallet className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">FinFlow Track</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <Button asChild size="sm" className="bg-gradient-hero shadow-glow hover:opacity-95">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "login" }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-hero shadow-glow hover:opacity-95">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started free
                </Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                hash={link.hash}
                onClick={() => setOpen(false)}
                className="text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {signedIn ? (
                <Button asChild size="sm" className="bg-gradient-hero">
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/auth" search={{ mode: "login" }}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-gradient-hero">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get started free
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
