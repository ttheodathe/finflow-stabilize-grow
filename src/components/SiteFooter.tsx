import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useState } from "react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "Pricing", to: "/pricing" },
      { label: "Reviews", to: "/testimonials" },
      { label: "Integrations", to: "/integrations" },
      { label: "Changelog", to: "/changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
      { label: "Testimonials", to: "/testimonials" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help center", to: "/help" },
      { label: "Guides", to: "/guides" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Refund Policy", to: "/refund" },
    ],
  },
  {
    title: "Comparison",
    links: [
      {label: "Finflow vs Quick books", to: "/compare/finflow-track-vs-quickbooks"},
      ],
  },
];

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/public/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        You're subscribed — thanks!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 max-w-sm">
      <label htmlFor="footer-newsletter-email" className="text-sm font-semibold">
        Get product & finance tips
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="footer-newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Subscribe
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-destructive">{errorMessage}</p>}
      <p className="mt-2 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
    </form>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
                <Wallet className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight">Finflow Track</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              100% free accounting software for small businesses worldwide. Built modern, built for
              you.
            </p>
            <NewsletterForm />
          </div>
          {footerLinks.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-semibold">{c.title}</div>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} FINFLOW TRACK. All rights reserved.</div>
          <div>Made for freelancers, startups, NGOs, and SMEs worldwide.</div>
        </div>
      </div>
    </footer>
  );
}
