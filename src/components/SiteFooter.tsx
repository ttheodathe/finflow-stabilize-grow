import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

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
      { label: "Testimonials", to: "/testimonials"
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
];

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
