import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Crown,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PlanCheckoutButton } from "@/components/PlanCheckoutButton";
import { PLANS } from "@/lib/paddle/config";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,

  head: () => ({
    meta: [
      {
        title: "FinFlow Track Pricing — Plans for Service Businesses",
      },
      {
        name: "description",
        content:
          "Compare FinFlow Track plans for service businesses. Start with invoicing, expense tracking and basic reports, then add team, reconciliation and advanced reporting features as your business needs grow.",
      },
    ],
  }),
});

function PricingPage() {
  return (
    <div className="bg-background">
      <SiteHeader />
      {/* HERO */}

      <section className="border-b">
        <div className="container mx-auto max-w-7xl px-6 py-20">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Simple & Transparent Pricing
          </span>

          <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
            Choose the right tools
            <br />
            for your next stage
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            Start with the essentials for sending client invoices, recording expenses and
            understanding your finances. Move to a higher plan when your team or reporting needs
            expand.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/features" className="rounded-lg border px-6 py-3 hover:bg-muted">
              Explore Features
            </Link>

            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground"
            >
              Talk to Sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}

      <section className="container mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-8">
            <ShieldCheck className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">Plan options</h3>

            <p className="mt-4 text-muted-foreground">
              Choose a plan based on the companies, team members and financial tools your business
              needs.
            </p>
          </div>

          <div className="rounded-xl border p-8">
            <Sparkles className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">Flexible Plans</h3>

            <p className="mt-4 text-muted-foreground">
              Select a plan based on your business size, users, companies, and required features.
            </p>
          </div>

          <div className="rounded-xl border p-8">
            <Users className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">Team Ready</h3>

            <p className="mt-4 text-muted-foreground">
              Invite team members and control access using permissions.
            </p>
          </div>

          <div className="rounded-xl border p-8">
            <Lock className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">Compare before upgrading</h3>

            <p className="mt-4 text-muted-foreground">
              Review the listed plan price and included limits before choosing.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING CARDS */}

      <section className="bg-muted/40">
        <div className="container mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-4xl font-bold">Plans for the way your business works</h2>

            <p className="mt-6 text-muted-foreground">
              Start with one business and the core finance workflow. Upgrade when you need more
              companies, team capacity or advanced tools.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {/* FREE */}

            <div className="rounded-2xl border bg-background p-8">
              <h3 className="text-2xl font-bold">Free</h3>

              <p className="mt-3 text-muted-foreground">
                For a service business getting its invoices and expenses organized.
              </p>

              <div className="mt-8 text-4xl font-bold">
                {PLANS.free.priceMonthly === null ? "Custom" : "$" + PLANS.free.priceMonthly}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </div>

              <ul className="mt-8 space-y-4">
                {[
                  "Basic accounting",
                  "Invoice creation",
                  "Expense tracking",
                  "Customer management",
                  "Basic reports",
                ].map((item) => (
                  <li key={item} className="flex items-center">
                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}
                  </li>
                ))}
              </ul>

              <PlanCheckoutButton
                plan="free"
                fromMarketing
                className="mt-10 block w-full rounded-lg border px-6 py-3 text-center"
              >
                Start Free
              </PlanCheckoutButton>
            </div>
            {/* PROFESSIONAL */}

            <div className="relative rounded-2xl border-2 border-primary bg-background p-8 shadow-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                Most Popular
              </div>

              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />

                <h3 className="text-2xl font-bold">Professional</h3>
              </div>

              <p className="mt-4 text-muted-foreground">
                For service teams that need more company and team capacity, reconciliation and
                advanced reporting.
              </p>

              <div className="mt-8">
                <span className="text-5xl font-bold">
                  {PLANS.pro.priceMonthly === null ? "Custom" : "$" + PLANS.pro.priceMonthly}
                </span>

                <span className="ml-2 text-muted-foreground">/month</span>
              </div>

              <ul className="mt-8 space-y-4">
                {[
                  "Everything in Free",
                  "Up to 5 Companies",
                  "Up to 15 Team Members",
                  "Inventory Management",
                  "Purchase Orders",
                  "Bank Reconciliation",
                  "Advanced Reports",
                  "Role-Based Permissions",
                  "AI Bookkeeper",
                  "Priority Email Support",
                ].map((item) => (
                  <li key={item} className="flex items-center">
                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}
                  </li>
                ))}
              </ul>

              <PlanCheckoutButton
                plan="pro"
                fromMarketing
                className="mt-10 block w-full rounded-lg bg-primary px-6 py-3 text-center text-primary-foreground"
              >
                Start Professional
              </PlanCheckoutButton>
            </div>

            {/* BUSINESS */}

            <div className="rounded-2xl border bg-background p-8">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />

                <h3 className="text-2xl font-bold">Business</h3>
              </div>

              <p className="mt-4 text-muted-foreground">
                For established teams that need the broader Business plan feature set.
              </p>

              <div className="mt-8">
                <span className="text-5xl font-bold">
                  {PLANS.business.priceMonthly === null
                    ? "Custom"
                    : "$" + PLANS.business.priceMonthly}
                </span>

                <span className="ml-2 text-muted-foreground">/month</span>
              </div>

              <ul className="mt-8 space-y-4">
                {[
                  "Everything in Professional",
                  "Up to 25 Companies",
                  "Unlimited Team Members",
                  "Payroll",
                  "CRM",
                  "Projects",
                  "Audit Logs",
                  "Advanced Analytics",
                  "API Access",
                  "Priority Support",
                ].map((item) => (
                  <li key={item} className="flex items-center">
                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}
                  </li>
                ))}
              </ul>

              <PlanCheckoutButton
                plan="business"
                fromMarketing
                className="mt-10 block w-full rounded-lg bg-primary px-6 py-3 text-center text-primary-foreground"
              >
                Start Business
              </PlanCheckoutButton>
            </div>

            {/* ENTERPRISE */}

            <div className="rounded-2xl border bg-background p-8">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-primary" />

                <h3 className="text-2xl font-bold">Enterprise</h3>
              </div>

              <p className="mt-4 text-muted-foreground">
                Custom pricing for organizations with requirements that need a direct discussion
                with our team.
              </p>

              <div className="mt-8">
                <span className="text-4xl font-bold">Custom Pricing</span>
              </div>

              <ul className="mt-8 space-y-4">
                {[
                  "Custom company limits",
                  "Custom user limits",
                  "Discuss your organization’s requirements",
                  "Contact the team for plan details",
                ].map((item) => (
                  <li key={item} className="flex items-center">
                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/contact" className="mt-10 block rounded-lg border px-6 py-3 text-center">
                Request a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* FEATURE COMPARISON */}

      <section className="container mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-4xl font-bold">Compare Plans</h2>

          <p className="mt-6 text-muted-foreground max-w-3xl mx-auto">
            Compare the included features and limits before selecting a plan. Feature access is
            subject to the current plan configuration.
          </p>
        </div>

        <div className="mt-16 overflow-x-auto rounded-2xl border">
          <table className="min-w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-5 text-left">Feature</th>

                <th className="px-6 py-5 text-center">Free</th>

                <th className="px-6 py-5 text-center">Professional</th>

                <th className="px-6 py-5 text-center">Business</th>

                <th className="px-6 py-5 text-center">Enterprise</th>
              </tr>
            </thead>

            <tbody>
              {[
                ["Companies", "1", "5", "25", "Unlimited"],
                ["Users", "2", "15", "Unlimited", "Unlimited"],
                ["Invoices", "✓", "✓", "✓", "✓"],
                ["Expenses", "✓", "✓", "✓", "✓"],
                ["Inventory", "—", "✓", "✓", "✓"],
                ["Warehouses", "—", "✓", "✓", "✓"],
                ["Purchase Orders", "—", "✓", "✓", "✓"],
                ["Payroll", "—", "—", "✓", "✓"],
                ["CRM", "—", "—", "✓", "✓"],
                ["Projects", "—", "—", "✓", "✓"],
                ["AI Bookkeeper", "—", "✓", "✓", "✓"],
                ["Financial Reports", "Basic", "Advanced", "Advanced", "Enterprise"],
                ["API Access", "—", "—", "✓", "✓"],
                ["Support level", "Standard", "Priority email", "Priority", "Enterprise support"],
              ].map((row) => (
                <tr key={row[0]} className="border-t">
                  <td className="px-6 py-5 font-medium">{row[0]}</td>

                  <td className="px-6 py-5 text-center">{row[1]}</td>
                  <td className="px-6 py-5 text-center">{row[2]}</td>
                  <td className="px-6 py-5 text-center">{row[3]}</td>
                  <td className="px-6 py-5 text-center">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* PRICING PHILOSOPHY */}

      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold">Pricing That Grows With Your Business</h2>

            <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              Choose a plan based on the company and team limits shown above. Review the included
              features and confirm any important requirement with our team before upgrading.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            <div className="rounded-xl border bg-background p-8">
              <Users className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">Built for Every Business</h3>

              <p className="mt-4 text-muted-foreground">
                Start with a service business and choose more capacity as your team grows.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-8">
              <Building2 className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">Upgrade When Ready</h3>

              <p className="mt-4 text-muted-foreground">
                Move to a plan with more company capacity, team members and financial tools when you
                need them.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-8">
              <BadgeCheck className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">Transparent Billing</h3>

              <p className="mt-4 text-muted-foreground">
                Review the listed monthly price, company limit and team limit before selecting a
                plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}

      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold">Frequently Asked Questions</h2>

            <p className="mt-6 text-lg text-muted-foreground">
              Everything you need to know before choosing a FinFlowTrack plan.
            </p>
          </div>

          <div className="mt-16 space-y-8">
            <div className="rounded-xl border bg-background p-8">
              <h3 className="text-xl font-semibold">Can I start with the Free plan?</h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Yes. The Free plan is ideal for freelancers, consultants, and new businesses. As
                your business grows, you can upgrade without losing your existing data.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-8">
              <h3 className="text-xl font-semibold">Can I upgrade or downgrade later?</h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Absolutely. Subscription plans are designed to grow alongside your business. You can
                move between plans as your operational needs change.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-8">
              <h3 className="text-xl font-semibold">How many companies can I manage?</h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Each subscription includes a different company limit. Higher plans allow you to
                manage more organizations while keeping each company's accounting records completely
                separate.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-8">
              <h3 className="text-xl font-semibold">Are my financial records secure?</h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Review the Security and Privacy pages for the current descriptions of account access
                and data handling. We do not claim independent security certifications on this
                pricing page.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-8">
              <h3 className="text-xl font-semibold">Do you offer Enterprise solutions?</h3>

              <p className="mt-4 text-muted-foreground leading-8">
                The Enterprise plan is listed as custom pricing. Contact us to discuss your
                organization’s requirements and confirm availability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="border-t">
        <div className="container mx-auto max-w-5xl px-6 py-24 text-center">
          <h2 className="text-5xl font-bold">
            Start Managing Your Business
            <br />
            With Confidence
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground">
            Create a business workspace, send a client invoice and keep a clearer record of payments
            and expenses.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              search={{ plan: "free" }}
              className="inline-flex items-center rounded-lg bg-primary px-8 py-4 text-primary-foreground"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <Link to="/contact" className="rounded-lg border px-8 py-4">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
