import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/pricing")({
  component: PricingPage,

  head: () => ({
    meta: [
      {
        title:
          "Pricing | FinFlowTrack Accounting Software Plans for Growing Businesses",
      },
      {
        name: "description",
        content:
          "Explore FinFlowTrack pricing plans designed for freelancers, startups, NGOs, and growing businesses. Choose flexible accounting software plans with invoicing, inventory, reporting, and team collaboration.",
      },
    ],
  }),
});


function PricingPage() {

  return (

    <div className="bg-background">


      {/* HERO */}

      <section className="border-b">

        <div className="container mx-auto max-w-7xl px-6 py-20">


          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">

            Simple & Transparent Pricing

          </span>



          <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">

            Choose the Plan That
            <br />
            Grows With Your Business

          </h1>



          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">

            FinFlowTrack provides flexible accounting solutions for freelancers,
            startups, nonprofits, and growing companies. Start with what you
            need today and upgrade as your business expands.

          </p>



          <div className="mt-10 flex flex-wrap gap-4">


            <Link
              to="/features"
              className="rounded-lg border px-6 py-3 hover:bg-muted"
            >

              Explore Features

            </Link>



            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground"
            >

              Talk to Sales

              <ArrowRight className="ml-2 h-4 w-4"/>

            </Link>


          </div>


        </div>

      </section>



      {/* TRUST SECTION */}


      <section className="container mx-auto max-w-7xl px-6 py-16">


        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">



          <div className="rounded-xl border p-8">


            <ShieldCheck className="mb-5 h-10 w-10 text-primary"/>


            <h3 className="text-xl font-semibold">

              Secure Billing

            </h3>


            <p className="mt-4 text-muted-foreground">

              Your account information and payment data are handled with modern
              security practices.

            </p>


          </div>





          <div className="rounded-xl border p-8">


            <Sparkles className="mb-5 h-10 w-10 text-primary"/>


            <h3 className="text-xl font-semibold">

              Flexible Plans

            </h3>


            <p className="mt-4 text-muted-foreground">

              Select a plan based on your business size, users, companies,
              and required features.

            </p>


          </div>





          <div className="rounded-xl border p-8">


            <Users className="mb-5 h-10 w-10 text-primary"/>


            <h3 className="text-xl font-semibold">

              Team Ready

            </h3>


            <p className="mt-4 text-muted-foreground">

              Invite team members and control access using permissions.

            </p>


          </div>





          <div className="rounded-xl border p-8">


            <Lock className="mb-5 h-10 w-10 text-primary"/>


            <h3 className="text-xl font-semibold">

              No Hidden Costs

            </h3>


            <p className="mt-4 text-muted-foreground">

              Clear pricing designed to help businesses plan confidently.

            </p>


          </div>



        </div>


      </section>



      {/* PRICING CARDS */}


      <section className="bg-muted/40">


        <div className="container mx-auto max-w-7xl px-6 py-20">


          <div className="text-center">


            <h2 className="text-4xl font-bold">

              Plans Designed For Every Stage

            </h2>


            <p className="mt-6 text-muted-foreground">

              Whether you are starting alone or managing a growing company,
              FinFlowTrack scales with your needs.

            </p>


          </div>



          <div className="mt-16 grid gap-8 lg:grid-cols-3">



            {/* FREE */}


            <div className="rounded-2xl border bg-background p-8">


              <h3 className="text-2xl font-bold">

                Free

              </h3>


              <p className="mt-3 text-muted-foreground">

                For individuals and small businesses getting started.

              </p>



              <div className="mt-8 text-4xl font-bold">

                $0

                <span className="text-base font-normal text-muted-foreground">

                  /month

                </span>

              </div>


              <ul className="mt-8 space-y-4">


                {[
                  "Basic accounting",
                  "Invoice creation",
                  "Expense tracking",
                  "Customer management",
                  "Basic reports",
                ].map((item)=>(

                  <li
                    key={item}
                    className="flex items-center"
                  >

                    <Check className="mr-3 h-5 w-5 text-green-600"/>

                    {item}

                  </li>

                ))}


              </ul>


              <Link
                to="/signup"
                className="mt-10 block rounded-lg border px-6 py-3 text-center"
              >

                Start Free

              </Link>


            </div>
                        {/* PROFESSIONAL */}

            <div className="relative rounded-2xl border-2 border-primary bg-background p-8 shadow-lg">

              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                Most Popular
              </div>

              <div className="flex items-center gap-3">

                <Sparkles className="h-8 w-8 text-primary" />

                <h3 className="text-2xl font-bold">
                  Professional
                </h3>

              </div>

              <p className="mt-4 text-muted-foreground">
                Designed for growing businesses that need collaboration,
                automation, inventory, and advanced reporting.
              </p>

              <div className="mt-8">

                <span className="text-5xl font-bold">
                  $19
                </span>

                <span className="ml-2 text-muted-foreground">
                  /month
                </span>

              </div>

              <ul className="mt-8 space-y-4">

                {[
                  "Everything in Free",
                  "Up to 3 Companies",
                  "Up to 10 Team Members",
                  "Inventory Management",
                  "Purchase Orders",
                  "Bank Reconciliation",
                  "Advanced Reports",
                  "Role-Based Permissions",
                  "Priority Email Support",
                ].map((item) => (

                  <li
                    key={item}
                    className="flex items-center"
                  >

                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}

                  </li>

                ))}

              </ul>

              <Link
                to="/signup"
                className="mt-10 block rounded-lg bg-primary px-6 py-3 text-center text-primary-foreground"
              >

                Start Professional

              </Link>

            </div>





            {/* BUSINESS */}

            <div className="rounded-2xl border bg-background p-8">

              <div className="flex items-center gap-3">

                <Building2 className="h-8 w-8 text-primary" />

                <h3 className="text-2xl font-bold">
                  Business
                </h3>

              </div>

              <p className="mt-4 text-muted-foreground">
                Built for established businesses managing multiple departments,
                users, and companies.
              </p>

              <div className="mt-8">

                <span className="text-5xl font-bold">
                  $49
                </span>

                <span className="ml-2 text-muted-foreground">
                  /month
                </span>

              </div>

              <ul className="mt-8 space-y-4">

                {[
                  "Everything in Professional",
                  "Up to 15 Companies",
                  "Unlimited Team Members",
                  "Payroll",
                  "CRM",
                  "Projects",
                  "Audit Logs",
                  "Advanced Analytics",
                  "API Access",
                  "Priority Support",
                ].map((item) => (

                  <li
                    key={item}
                    className="flex items-center"
                  >

                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}

                  </li>

                ))}

              </ul>

              <Link
                to="/contact"
                className="mt-10 block rounded-lg border px-6 py-3 text-center"
              >

                Contact Sales

              </Link>

            </div>





            {/* ENTERPRISE */}

            <div className="rounded-2xl border bg-background p-8">

              <div className="flex items-center gap-3">

                <Crown className="h-8 w-8 text-primary" />

                <h3 className="text-2xl font-bold">
                  Enterprise
                </h3>

              </div>

              <p className="mt-4 text-muted-foreground">
                Tailored solutions for organizations requiring custom
                deployments, integrations, and enterprise support.
              </p>

              <div className="mt-8">

                <span className="text-4xl font-bold">
                  Custom Pricing
                </span>

              </div>

              <ul className="mt-8 space-y-4">

                {[
                  "Unlimited Companies",
                  "Unlimited Users",
                  "Dedicated Account Manager",
                  "Custom Integrations",
                  "Advanced Security",
                  "Priority Infrastructure",
                  "Migration Assistance",
                  "Training",
                  "SLA Options",
                  "Enterprise Support",
                ].map((item) => (

                  <li
                    key={item}
                    className="flex items-center"
                  >

                    <Check className="mr-3 h-5 w-5 text-green-600" />

                    {item}

                  </li>

                ))}

              </ul>

              <Link
                to="/contact"
                className="mt-10 block rounded-lg border px-6 py-3 text-center"
              >

                Request a Demo

              </Link>

            </div>

          </div>

        </div>

      </section>
            {/* FEATURE COMPARISON */}

      <section className="container mx-auto max-w-7xl px-6 py-24">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            Compare Plans
          </h2>

          <p className="mt-6 text-muted-foreground max-w-3xl mx-auto">
            Every FinFlowTrack subscription includes secure cloud accounting.
            Upgrade when your business needs additional companies, users,
            automation, and advanced financial tools.
          </p>

        </div>

        <div className="mt-16 overflow-x-auto rounded-2xl border">

          <table className="min-w-full">

            <thead className="bg-muted">

              <tr>

                <th className="px-6 py-5 text-left">
                  Feature
                </th>

                <th className="px-6 py-5 text-center">
                  Free
                </th>

                <th className="px-6 py-5 text-center">
                  Professional
                </th>

                <th className="px-6 py-5 text-center">
                  Business
                </th>

                <th className="px-6 py-5 text-center">
                  Enterprise
                </th>

              </tr>

            </thead>

            <tbody>

              {[
                ["Companies","1","5","25","Unlimited"],
                ["Users","2","15","Unlimited","Unlimited"],
                ["Invoices","✓","✓","✓","✓"],
                ["Expenses","✓","✓","✓","✓"],
                ["Inventory","—","✓","✓","✓"],
                ["Warehouses","—","✓","✓","✓"],
                ["Purchase Orders","—","✓","✓","✓"],
                ["Payroll","—","—","✓","✓"],
                ["CRM","—","—","✓","✓"],
                ["Projects","—","—","✓","✓"],
                ["AI Bookkeeper","—","✓","✓","✓"],
                ["Financial Reports","Basic","Advanced","Advanced","Enterprise"],
                ["API Access","—","—","✓","✓"],
                ["Priority Support","—","Email","Priority","Dedicated"],
              ].map((row)=>(
                <tr
                  key={row[0]}
                  className="border-t"
                >

                  <td className="px-6 py-5 font-medium">
                    {row[0]}
                  </td>

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

            <h2 className="text-4xl font-bold">
              Pricing That Grows With Your Business
            </h2>

            <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              We believe accounting software should be transparent,
              predictable, and scalable. Rather than charging for every small
              feature, our plans are designed around how businesses naturally
              grow—adding more companies, users, and advanced capabilities as
              your organization expands.
            </p>

          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">

            <div className="rounded-xl border bg-background p-8">

              <Users className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="text-xl font-semibold">
                Built for Every Business
              </h3>

              <p className="mt-4 text-muted-foreground">
                Whether you're a freelancer or a multinational organization,
                there's a plan designed for your stage of growth.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Building2 className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="text-xl font-semibold">
                Upgrade When Ready
              </h3>

              <p className="mt-4 text-muted-foreground">
                Start with the features you need today and unlock more
                companies, users, automation, and reporting as your business
                evolves.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <BadgeCheck className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="text-xl font-semibold">
                Transparent Billing
              </h3>

              <p className="mt-4 text-muted-foreground">
                No hidden fees, surprise upgrades, or confusing pricing
                structures. Clear subscriptions make planning easier.
              </p>

            </div>

          </div>

        </div>

      </section>





      {/* SECURITY & COMPLIANCE */}

      <section className="container mx-auto max-w-7xl px-6 py-24">

        <div className="grid gap-12 lg:grid-cols-2">

          <div>

            <ShieldCheck className="mb-6 h-12 w-12 text-primary"/>

            <h2 className="text-4xl font-bold">
              Secure Payments & Trusted Billing
            </h2>

            <p className="mt-6 leading-8 text-muted-foreground">
              FinFlowTrack is committed to protecting customer information
              throughout the subscription lifecycle. Billing systems are
              designed with modern security practices to safeguard payment and
              account data.
            </p>

          </div>

          <div className="space-y-5">

            {[
              "Encrypted payment processing",
              "Secure customer authentication",
              "Role-based account management",
              "Subscription history",
              "Transparent invoices",
              "Automatic renewal controls",
              "Cancellation controls",
              "Privacy-focused billing",
            ].map((item)=>(

              <div
                key={item}
                className="flex items-center rounded-xl border p-5"
              >

                <ShieldCheck className="mr-4 h-5 w-5 text-primary"/>

                {item}

              </div>

            ))}

          </div>

        </div>

      </section>
            {/* FAQ */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-5xl px-6 py-24">

          <div className="text-center">

            <h2 className="text-4xl font-bold">
              Frequently Asked Questions
            </h2>

            <p className="mt-6 text-lg text-muted-foreground">
              Everything you need to know before choosing a FinFlowTrack plan.
            </p>

          </div>

          <div className="mt-16 space-y-8">

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Can I start with the Free plan?
              </h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Yes. The Free plan is ideal for freelancers, consultants, and
                new businesses. As your business grows, you can upgrade without
                losing your existing data.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Can I upgrade or downgrade later?
              </h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Absolutely. Subscription plans are designed to grow alongside
                your business. You can move between plans as your operational
                needs change.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                How many companies can I manage?
              </h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Each subscription includes a different company limit. Higher
                plans allow you to manage more organizations while keeping each
                company's accounting records completely separate.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Are my financial records secure?
              </h3>

              <p className="mt-4 text-muted-foreground leading-8">
                FinFlowTrack is built using modern security practices including
                encrypted communications, authentication controls, audit
                logging, and role-based permissions to help protect your
                business information.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Do you offer Enterprise solutions?
              </h3>

              <p className="mt-4 text-muted-foreground leading-8">
                Yes. Enterprise customers can request custom deployments,
                onboarding assistance, advanced integrations, dedicated support,
                and tailored commercial agreements.
              </p>

            </div>

          </div>

        </div>

      </section>





      {/* WHY TRUST FINFLOWTRACK */}

      <section>

        <div className="container mx-auto max-w-7xl px-6 py-24">

          <div className="text-center">

            <h2 className="text-4xl font-bold">
              Why Trust FinFlowTrack?
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
              Trust is essential when managing financial information.
              FinFlowTrack is designed with transparency, security,
              and long-term reliability at its core.
            </p>

          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-xl border p-8">

              <ShieldCheck className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="font-semibold text-xl">
                Secure Platform
              </h3>

              <p className="mt-4 text-muted-foreground">
                Modern authentication, encrypted communications,
                and permission-based access.
              </p>

            </div>

            <div className="rounded-xl border p-8">

              <BadgeCheck className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="font-semibold text-xl">
                Transparent Pricing
              </h3>

              <p className="mt-4 text-muted-foreground">
                Clear subscription plans with no hidden charges or
                unexpected upgrades.
              </p>

            </div>

            <div className="rounded-xl border p-8">

              <Users className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="font-semibold text-xl">
                Built for Teams
              </h3>

              <p className="mt-4 text-muted-foreground">
                Collaborate securely using role-based permissions,
                invitations, and multi-company support.
              </p>

            </div>

            <div className="rounded-xl border p-8">

              <Sparkles className="mb-5 h-10 w-10 text-primary"/>

              <h3 className="font-semibold text-xl">
                Continuous Innovation
              </h3>

              <p className="mt-4 text-muted-foreground">
                Regular product improvements, new features,
                and ongoing platform enhancements.
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
            Join businesses using FinFlowTrack to simplify accounting,
            invoicing, inventory, payroll, financial reporting,
            and team collaboration from one secure cloud platform.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">

            <Link
              to="/signup"
              className="inline-flex items-center rounded-lg bg-primary px-8 py-4 text-primary-foreground"
            >
              Start Free

              <ArrowRight className="ml-2 h-4 w-4"/>

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
