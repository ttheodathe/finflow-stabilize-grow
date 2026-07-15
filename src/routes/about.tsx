import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Target,
  Eye,
  Users,
  Sparkles,
  Lock,
  BarChart3,
  Globe,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      {
        title:
          "About FinFlowTrack | Smart Accounting Software for Growing Businesses",
      },
      {
        name: "description",
        content:
          "Learn about FinFlowTrack, our mission, vision, values, security commitment, and how we're building modern accounting software for businesses worldwide.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="bg-background">

      {/* Hero */}
      <section className="border-b">
        <div className="container mx-auto max-w-7xl px-6 py-20">

          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            About FinFlowTrack
          </span>

          <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
            Smart Accounting
            <br />
            Built for Growing Businesses
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            FinFlowTrack is a modern cloud accounting platform helping
            freelancers, startups, nonprofits, accountants, and growing
            businesses simplify financial management through secure,
            intelligent, and scalable software.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              to="/pricing"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
            >
              View Pricing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <Link
              to="/features"
              className="inline-flex items-center rounded-lg border px-6 py-3 hover:bg-muted"
            >
              Explore Features
            </Link>

          </div>

        </div>
      </section>

      {/* Mission & Vision */}

      <section className="container mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-10 lg:grid-cols-2">

          <div className="rounded-2xl border p-8">

            <Target className="mb-6 h-10 w-10 text-primary" />

            <h2 className="text-3xl font-bold">
              Our Mission
            </h2>

            <p className="mt-6 leading-8 text-muted-foreground">
              Our mission is to make professional accounting software
              accessible, affordable, and intuitive for businesses of every
              size. We believe financial management should empower business
              owners instead of slowing them down.
            </p>

          </div>

          <div className="rounded-2xl border p-8">

            <Eye className="mb-6 h-10 w-10 text-primary" />

            <h2 className="text-3xl font-bold">
              Our Vision
            </h2>

            <p className="mt-6 leading-8 text-muted-foreground">
              We envision a future where every entrepreneur can access
              enterprise-grade accounting tools regardless of company size,
              enabling smarter decisions and sustainable growth.
            </p>

          </div>

        </div>

      </section>

      {/* Core Values */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <div className="text-center">

            <h2 className="text-4xl font-bold">
              Our Core Values
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-muted-foreground">
              Every feature we build and every decision we make is guided by
              these principles.
            </p>

          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-xl border bg-background p-8">

              <ShieldCheck className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">
                Trust
              </h3>

              <p className="mt-4 text-muted-foreground">
                Financial data deserves the highest standards of integrity and
                transparency.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Sparkles className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">
                Innovation
              </h3>

              <p className="mt-4 text-muted-foreground">
                We continuously improve using modern technology and AI-powered
                automation.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Users className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">
                Customer First
              </h3>

              <p className="mt-4 text-muted-foreground">
                Every improvement starts by understanding real business needs.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Globe className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-xl font-semibold">
                Accessibility
              </h3>

              <p className="mt-4 text-muted-foreground">
                Powerful accounting software should be available to businesses
                everywhere.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* What We Offer */}

      <section className="container mx-auto max-w-7xl px-6 py-20">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            What FinFlowTrack Offers
          </h2>

        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {[
            "Invoicing",
            "Expense Management",
            "Inventory Management",
            "CRM",
            "Projects",
            "Bank Reconciliation",
            "Payroll",
            "Financial Reports",
            "Multi-company Management",
            "AI Bookkeeper",
            "Role-based Permissions",
            "Subscription Management",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center rounded-xl border p-5"
            >
              <CheckCircle2 className="mr-3 h-5 w-5 text-green-600" />
              {item}
            </div>
          ))}

        </div>

      </section>

      {/* Security */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <div className="grid gap-12 lg:grid-cols-2">

            <div>

              <Lock className="mb-5 h-10 w-10 text-primary" />

              <h2 className="text-4xl font-bold">
                Security First
              </h2>

              <p className="mt-6 leading-8 text-muted-foreground">
                Protecting customer data is fundamental to everything we build.
                FinFlowTrack follows modern application security practices and
                continuously improves its security posture.
              </p>

            </div>

            <div className="space-y-4">

              {[
                "Encrypted HTTPS communication",
                "Role-Based Access Control",
                "Audit Logs",
                "Secure Authentication",
                "Automatic Backups",
                "Cloud Infrastructure",
                "GDPR-conscious Privacy",
                "Continuous Security Improvements",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center rounded-lg border p-4"
                >
                  <ShieldCheck className="mr-3 h-5 w-5 text-primary" />
                  {item}
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>

      {/* Roadmap */}

      <section className="container mx-auto max-w-7xl px-6 py-20">

        <BarChart3 className="mb-6 h-10 w-10 text-primary" />

        <h2 className="text-4xl font-bold">
          Product Roadmap
        </h2>

        <p className="mt-6 max-w-3xl text-muted-foreground">
          We're continuously improving FinFlowTrack to meet the evolving needs
          of businesses around the world.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          {[
            "AI Automation",
            "Bank Integrations",
            "Public API",
            "Mobile Apps",
            "Advanced Reporting",
            "Payroll Enhancements",
            "Workflow Automation",
            "Marketplace Integrations",
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border p-6 text-center font-medium"
            >
              {item}
            </div>
          ))}

        </div>

      </section>

      {/* CTA */}

      <section className="border-t">

        <div className="container mx-auto max-w-5xl px-6 py-20 text-center">

          <h2 className="text-4xl font-bold">
            Join Thousands of Businesses
            <br />
            Building Better Financial Workflows
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
            Whether you're launching your first business or managing multiple
            companies, FinFlowTrack is designed to grow with you.
          </p>

          <div className="mt-10 flex justify-center gap-4">

            <Link
              to="/pricing"
              className="rounded-lg bg-primary px-8 py-3 text-primary-foreground"
            >
              Get Started
            </Link>

            <Link
              to="/contact"
              className="rounded-lg border px-8 py-3"
            >
              Contact Us
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}
