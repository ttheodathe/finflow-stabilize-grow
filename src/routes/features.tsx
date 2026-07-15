import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Building2,
  CreditCard,
  DollarSign,
  FileBarChart2,
  FileSpreadsheet,
  Globe,
  Layers3,
  Lock,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
  head: () => ({
    meta: [
      {
        title:
          "Features | FinFlowTrack - Modern Accounting Software for Growing Businesses",
      },
      {
        name: "description",
        content:
          "Discover everything FinFlowTrack offers including invoicing, inventory, bookkeeping, CRM, payroll, financial reporting, AI automation, and multi-company accounting.",
      },
    ],
  }),
});

function FeaturesPage() {
  return (
    <div className="bg-background">

      {/* HERO */}

      <section className="border-b">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            FinFlowTrack Features
          </span>

          <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
            Everything You Need
            <br />
            To Run Your Business
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            FinFlowTrack combines accounting, invoicing, inventory,
            CRM, banking, payroll, financial reporting and AI-powered
            bookkeeping into one secure cloud platform designed for
            freelancers, startups, NGOs and growing businesses.
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
              to="/about"
              className="inline-flex items-center rounded-lg border px-6 py-3 hover:bg-muted"
            >
              Learn More
            </Link>

          </div>

        </div>

      </section>

      {/* TRUST */}

      <section className="container mx-auto max-w-7xl px-6 py-16">

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border p-8">

            <ShieldCheck className="mb-4 h-10 w-10 text-primary" />

            <h3 className="font-semibold text-xl">
              Secure by Design
            </h3>

            <p className="mt-4 text-muted-foreground">
              Modern authentication, encrypted connections,
              role-based permissions and audit logs.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Globe className="mb-4 h-10 w-10 text-primary" />

            <h3 className="font-semibold text-xl">
              Cloud-Based
            </h3>

            <p className="mt-4 text-muted-foreground">
              Access your financial information securely from
              anywhere.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <BadgeCheck className="mb-4 h-10 w-10 text-primary" />

            <h3 className="font-semibold text-xl">
              Built for Growth
            </h3>

            <p className="mt-4 text-muted-foreground">
              Start with one business and expand to multiple
              companies as you grow.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <BrainCircuit className="mb-4 h-10 w-10 text-primary" />

            <h3 className="font-semibold text-xl">
              AI Ready
            </h3>

            <p className="mt-4 text-muted-foreground">
              AI-powered bookkeeping and automation designed
              to save valuable time.
            </p>

          </div>

        </div>

      </section>

      {/* FEATURE GRID */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <div className="text-center">

            <h2 className="text-4xl font-bold">
              Powerful Modules
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-muted-foreground">
              Everything your finance team needs in one
              integrated platform.
            </p>

          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            <div className="rounded-xl border bg-background p-8">

              <Receipt className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Smart Invoicing
              </h3>

              <p className="mt-5 text-muted-foreground">
                Create professional invoices, recurring invoices,
                quotations and payment reminders.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <DollarSign className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Expense Management
              </h3>

              <p className="mt-5 text-muted-foreground">
                Organize expenses, upload receipts,
                categorize spending and track cash flow.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Package className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Inventory Management
              </h3>

              <p className="mt-5 text-muted-foreground">
                Products, warehouses, stock movements,
                purchase orders and low-stock alerts.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Building2 className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Multi-Company
              </h3>

              <p className="mt-5 text-muted-foreground">
                Manage multiple organizations from one account
                with subscription-based company limits.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Users className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Team Collaboration
              </h3>

              <p className="mt-5 text-muted-foreground">
                Invite employees and assign permissions
                according to their responsibilities.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <CreditCard className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Banking
              </h3>

              <p className="mt-5 text-muted-foreground">
                Manage accounts, transactions,
                reconciliation and cash balances.
              </p>

            </div>

          </div>

        </div>

      </section>
            {/* ADVANCED MODULES */}

      <section className="container mx-auto max-w-7xl px-6 py-20">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            Advanced Business Tools
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-muted-foreground">
            Beyond bookkeeping, FinFlowTrack provides the tools modern
            businesses need to collaborate, automate processes, and make
            informed financial decisions.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-xl border p-8">

            <FileBarChart2 className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-2xl font-semibold">
              Financial Reporting
            </h3>

            <p className="mt-5 text-muted-foreground">
              Generate Profit & Loss statements, Balance Sheets,
              Trial Balance, Cash Flow reports, General Ledger,
              Tax summaries, and executive dashboards.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <BrainCircuit className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-2xl font-semibold">
              AI Bookkeeper
            </h3>

            <p className="mt-5 text-muted-foreground">
              AI assists with transaction categorization,
              bookkeeping suggestions, anomaly detection,
              forecasting, and accounting recommendations.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Users className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-2xl font-semibold">
              Customer Relationship Management
            </h3>

            <p className="mt-5 text-muted-foreground">
              Manage customers, suppliers, contacts,
              sales opportunities and communication history
              from one centralized workspace.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Layers3 className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-2xl font-semibold">
              Project Management
            </h3>

            <p className="mt-5 text-muted-foreground">
              Organize projects, assign tasks,
              track project expenses,
              manage profitability,
              and monitor project progress.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <FileSpreadsheet className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-2xl font-semibold">
              Payroll
            </h3>

            <p className="mt-5 text-muted-foreground">
              Manage employees, salaries,
              payroll processing,
              deductions, taxes,
              and payroll reports.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Sparkles className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-2xl font-semibold">
              Subscription Management
            </h3>

            <p className="mt-5 text-muted-foreground">
              Flexible plans allow businesses
              to unlock additional companies,
              team members,
              storage,
              and premium functionality
              as they grow.
            </p>

          </div>

        </div>

      </section>

      {/* SECURITY */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <div className="grid gap-14 lg:grid-cols-2">

            <div>

              <Lock className="mb-6 h-12 w-12 text-primary" />

              <h2 className="text-4xl font-bold">
                Security You Can Trust
              </h2>

              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Financial data is among the most sensitive information a
                business owns. FinFlowTrack is designed with security,
                privacy, and reliability at its core.
              </p>

              <p className="mt-6 leading-8 text-muted-foreground">
                We continuously improve our infrastructure and application
                architecture to help protect customer information while
                delivering a dependable cloud accounting experience.
              </p>

            </div>

            <div className="grid gap-5">

              {[
                "Encrypted HTTPS communication",
                "Role-Based Access Control (RBAC)",
                "Audit Logging",
                "Secure Cloud Infrastructure",
                "Automatic Database Backups",
                "GDPR-conscious Privacy Practices",
                "Modern Authentication",
                "Continuous Security Improvements",
              ].map((feature) => (

                <div
                  key={feature}
                  className="flex items-center rounded-xl border bg-background p-5"
                >

                  <ShieldCheck className="mr-4 h-5 w-5 text-primary" />

                  <span>{feature}</span>

                </div>

              ))}

            </div>

          </div>

        </div>

      </section>

      {/* INTEGRATIONS */}

      <section className="container mx-auto max-w-7xl px-6 py-20">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            Built to Connect
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-muted-foreground">
            FinFlowTrack is designed with integration in mind, allowing
            businesses to streamline workflows and reduce manual work.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {[
            {
              title: "Banking",
              desc: "Connect financial accounts for reconciliation.",
            },
            {
              title: "Payment Gateways",
              desc: "Accept online payments securely.",
            },
            {
              title: "API Access",
              desc: "Build custom integrations using our API.",
            },
            {
              title: "CSV & Excel",
              desc: "Import and export financial data easily.",
            },
            {
              title: "Email Services",
              desc: "Send invoices and customer notifications.",
            },
            {
              title: "Cloud Storage",
              desc: "Store receipts and business documents.",
            },
            {
              title: "Accounting Ecosystem",
              desc: "Integrate with business tools as our ecosystem grows.",
            },
            {
              title: "Future Marketplace",
              desc: "Discover third-party extensions and applications.",
            },
          ].map((item) => (

            <div
              key={item.title}
              className="rounded-xl border p-7"
            >

              <h3 className="text-xl font-semibold">
                {item.title}
              </h3>

              <p className="mt-4 text-muted-foreground">
                {item.desc}
              </p>

            </div>

          ))}

        </div>

      </section>
            {/* WHY FINFLOWTRACK */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <div className="text-center">

            <h2 className="text-4xl font-bold">
              Why Businesses Choose FinFlowTrack
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-muted-foreground">
              FinFlowTrack is designed to help businesses simplify accounting,
              improve visibility into financial performance, and scale with
              confidence.
            </p>

          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            {[
              {
                title: "Modern Cloud Platform",
                desc: "Access your financial information anytime from anywhere with secure cloud infrastructure.",
              },
              {
                title: "Simple User Experience",
                desc: "An intuitive interface reduces complexity and helps teams work more efficiently.",
              },
              {
                title: "Business Growth",
                desc: "Start small and unlock additional companies, users, and advanced features as your business expands.",
              },
              {
                title: "Automation",
                desc: "Reduce repetitive tasks with intelligent bookkeeping assistance and workflow automation.",
              },
              {
                title: "Accurate Reporting",
                desc: "Generate real-time financial reports to support better business decisions.",
              },
              {
                title: "Enterprise Architecture",
                desc: "Built on modern technologies with scalability, security, and maintainability in mind.",
              },
            ].map((item) => (

              <div
                key={item.title}
                className="rounded-xl border bg-background p-8"
              >

                <BadgeCheck className="mb-5 h-10 w-10 text-primary" />

                <h3 className="text-xl font-semibold">
                  {item.title}
                </h3>

                <p className="mt-4 text-muted-foreground">
                  {item.desc}
                </p>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* FEATURE COMPARISON */}

      <section className="container mx-auto max-w-7xl px-6 py-20">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            Everything in One Platform
          </h2>

          <p className="mt-6 text-muted-foreground">
            Replace multiple disconnected tools with one integrated solution.
          </p>

        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border">

          <table className="w-full">

            <thead className="bg-muted">

              <tr>

                <th className="px-6 py-5 text-left">
                  Module
                </th>

                <th className="px-6 py-5 text-center">
                  Included
                </th>

              </tr>

            </thead>

            <tbody>

              {[
                "Accounting",
                "Invoices",
                "Expenses",
                "Inventory",
                "CRM",
                "Projects",
                "Payroll",
                "Banking",
                "Reports",
                "AI Bookkeeper",
                "Multi-company",
                "User Permissions",
                "Audit Logs",
                "API",
              ].map((module) => (

                <tr
                  key={module}
                  className="border-t"
                >

                  <td className="px-6 py-5">
                    {module}
                  </td>

                  <td className="px-6 py-5 text-center">

                    <BadgeCheck className="mx-auto h-5 w-5 text-green-600" />

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>

      {/* FAQ */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-5xl px-6 py-20">

          <div className="text-center">

            <h2 className="text-4xl font-bold">
              Frequently Asked Questions
            </h2>

          </div>

          <div className="mt-14 space-y-8">

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Who is FinFlowTrack designed for?
              </h3>

              <p className="mt-4 text-muted-foreground">
                FinFlowTrack is designed for freelancers, startups,
                nonprofits, accountants, agencies, retailers, and
                small to medium-sized businesses.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Can I manage multiple companies?
              </h3>

              <p className="mt-4 text-muted-foreground">
                Yes. Depending on your subscription, you can create,
                manage, and switch between multiple companies while
                keeping financial records separate.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Does FinFlowTrack include inventory management?
              </h3>

              <p className="mt-4 text-muted-foreground">
                Yes. Inventory features include products,
                warehouses, stock adjustments, purchase orders,
                stock movements, and low-stock alerts.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Is my business data secure?
              </h3>

              <p className="mt-4 text-muted-foreground">
                FinFlowTrack uses modern authentication, encrypted
                communication, role-based permissions, audit logging,
                and secure cloud infrastructure to help protect your
                financial information.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* FINAL CTA */}

      <section className="border-t">

        <div className="container mx-auto max-w-5xl px-6 py-24 text-center">

          <h2 className="text-5xl font-bold">
            Ready to Simplify Your Business Finances?
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground">
            Join businesses using FinFlowTrack to manage accounting,
            inventory, invoicing, payroll, reporting, and business
            operations from one secure cloud platform.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">

            <Link
              to="/pricing"
              className="inline-flex items-center rounded-lg bg-primary px-8 py-4 text-primary-foreground"
            >
              Get Started

              <ArrowRight className="ml-2 h-4 w-4" />

            </Link>

            <Link
              to="/contact"
              className="rounded-lg border px-8 py-4"
            >
              Contact Sales
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}
