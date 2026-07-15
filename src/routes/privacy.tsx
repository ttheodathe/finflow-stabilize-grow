import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Database,
  Eye,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,

  head: () => ({
    meta: [
      {
        title:
          "Privacy Policy | FinFlowTrack",
      },
      {
        name: "description",
        content:
          "Read the FinFlowTrack Privacy Policy to learn how we collect, use, protect, and manage personal and business information.",
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="bg-background">

      {/* HERO */}

      <section className="border-b">

        <div className="container mx-auto max-w-7xl px-6 py-20">

          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Privacy Policy
          </span>

          <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
            Your Privacy Matters
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            This Privacy Policy explains how FinFlowTrack collects, uses,
            stores, and protects personal information when you use our
            accounting platform, website, and related services.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              to="/security"
              className="rounded-lg border px-6 py-3 hover:bg-muted"
            >
              Security
            </Link>

            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground"
            >
              Contact Us

              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

          </div>

        </div>

      </section>

      {/* SUMMARY */}

      <section className="container mx-auto max-w-7xl px-6 py-16">

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border p-8">

            <Lock className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">
              Secure by Design
            </h3>

            <p className="mt-4 text-muted-foreground">
              We use technical and organizational measures designed to help
              protect the information entrusted to us.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Eye className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">
              Transparent
            </h3>

            <p className="mt-4 text-muted-foreground">
              We explain what information we collect and how it is used in
              clear language.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Database className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">
              Data Responsibility
            </h3>

            <p className="mt-4 text-muted-foreground">
              We collect information necessary to provide and improve our
              services.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <ShieldCheck className="mb-5 h-10 w-10 text-primary" />

            <h3 className="text-xl font-semibold">
              Customer Trust
            </h3>

            <p className="mt-4 text-muted-foreground">
              Protecting customer information is a core part of how we build
              FinFlowTrack.
            </p>

          </div>

        </div>

      </section>

      {/* INFORMATION WE COLLECT */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-6xl px-6 py-20">

          <h2 className="text-4xl font-bold">
            Information We Collect
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Depending on how you interact with FinFlowTrack, we may collect
            different categories of information to operate the platform and
            deliver requested services.
          </p>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">

            <div className="rounded-xl border bg-background p-8">

              <UserCheck className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Account Information
              </h3>

              <ul className="mt-6 space-y-3 text-muted-foreground">

                <li>• Name</li>
                <li>• Email address</li>
                <li>• Business name</li>
                <li>• User profile information</li>
                <li>• Authentication details</li>

              </ul>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <Database className="mb-5 h-10 w-10 text-primary" />

              <h3 className="text-2xl font-semibold">
                Business Data
              </h3>

              <ul className="mt-6 space-y-3 text-muted-foreground">

                <li>• Financial records</li>
                <li>• Invoices</li>
                <li>• Expenses</li>
                <li>• Inventory records</li>
                <li>• Customer and supplier information</li>

              </ul>

            </div>

          </div>

        </div>

      </section>
                {/* HOW WE USE INFORMATION */}

      <section className="container mx-auto max-w-6xl px-6 py-20">

        <h2 className="text-4xl font-bold">
          How We Use Information
        </h2>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-muted-foreground">
          We use the information we collect to provide, maintain, improve,
          secure, and support FinFlowTrack. Our goal is to deliver reliable
          accounting software while protecting customer information and
          continuously improving the platform.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-xl border p-8">

            <ShieldCheck className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Provide Services
            </h3>

            <p className="mt-4 text-muted-foreground">
              Create accounts, process accounting records, manage subscriptions,
              and deliver requested platform features.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Database className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Improve the Platform
            </h3>

            <p className="mt-4 text-muted-foreground">
              Analyze usage patterns to improve usability, performance,
              reliability, and customer experience.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Mail className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Customer Communication
            </h3>

            <p className="mt-4 text-muted-foreground">
              Send account notifications, service announcements,
              product updates, billing information,
              and support communications.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Lock className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Security
            </h3>

            <p className="mt-4 text-muted-foreground">
              Detect fraud, unauthorized access,
              suspicious activities,
              and protect customer accounts.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <UserCheck className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Customer Support
            </h3>

            <p className="mt-4 text-muted-foreground">
              Respond to support requests,
              resolve technical issues,
              and improve service quality.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Globe className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Legal Compliance
            </h3>

            <p className="mt-4 text-muted-foreground">
              Meet applicable legal obligations,
              protect customer rights,
              and enforce our Terms of Service.
            </p>

          </div>

        </div>

      </section>





      {/* COOKIES */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-6xl px-6 py-20">

          <h2 className="text-4xl font-bold">
            Cookies & Similar Technologies
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">

            FinFlowTrack may use cookies and similar technologies to improve
            website functionality, maintain secure sessions,
            remember preferences,
            measure platform performance,
            and understand how visitors interact with our services.

          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Essential Cookies
              </h3>

              <p className="mt-4 text-muted-foreground">
                Required for authentication,
                navigation,
                and core platform functionality.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Analytics
              </h3>

              <p className="mt-4 text-muted-foreground">
                Help us understand platform usage
                and improve product performance.
              </p>

            </div>

            <div className="rounded-xl border bg-background p-8">

              <h3 className="text-xl font-semibold">
                Preferences
              </h3>

              <p className="mt-4 text-muted-foreground">
                Remember language,
                interface,
                and personalization settings.
              </p>

            </div>

          </div>

        </div>

      </section>





      {/* DATA SHARING */}

      <section className="container mx-auto max-w-6xl px-6 py-20">

        <h2 className="text-4xl font-bold">
          When Information May Be Shared
        </h2>

        <p className="mt-6 text-lg leading-8 text-muted-foreground">

          We do not sell personal information. Information may be shared only
          when necessary to operate our services, comply with legal obligations,
          or protect the security and integrity of FinFlowTrack.

        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2">

          <div className="rounded-xl border p-8">

            <h3 className="text-2xl font-semibold">
              Service Providers
            </h3>

            <p className="mt-5 text-muted-foreground leading-8">

              We may work with carefully selected providers that help us
              deliver hosting, authentication, payment processing,
              communications, analytics, or customer support.

            </p>

          </div>

          <div className="rounded-xl border p-8">

            <h3 className="text-2xl font-semibold">
              Legal Requirements
            </h3>

            <p className="mt-5 text-muted-foreground leading-8">

              Information may be disclosed where required by law,
              regulation,
              court order,
              or to protect the rights,
              safety,
              and security of our customers and platform.

            </p>

          </div>

        </div>

      </section>





      {/* DATA RETENTION */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-6xl px-6 py-20">

          <h2 className="text-4xl font-bold">
            Data Retention
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">

            We retain information for as long as necessary to provide
            FinFlowTrack services, comply with legal obligations,
            resolve disputes,
            enforce agreements,
            and maintain the security and reliability of the platform.
            Retention periods may vary depending on the type of information
            and applicable legal requirements.

          </p>

        </div>

      </section>
                {/* YOUR PRIVACY RIGHTS */}

      <section className="container mx-auto max-w-6xl px-6 py-20">

        <h2 className="text-4xl font-bold">
          Your Privacy Rights
        </h2>

        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Depending on your location and applicable laws, you may have rights
          regarding the personal information we hold about you. We aim to
          respond to legitimate privacy requests within a reasonable timeframe
          and in accordance with applicable legal requirements.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-xl border p-8">

            <UserCheck className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Access
            </h3>

            <p className="mt-4 text-muted-foreground">
              Request information about the personal data associated with your
              account where applicable.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <Database className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Correction
            </h3>

            <p className="mt-4 text-muted-foreground">
              Update inaccurate or incomplete account information through your
              account settings or by contacting our support team.
            </p>

          </div>

          <div className="rounded-xl border p-8">

            <ShieldCheck className="mb-5 h-10 w-10 text-primary"/>

            <h3 className="text-xl font-semibold">
              Deletion
            </h3>

            <p className="mt-4 text-muted-foreground">
              You may request deletion of your account and associated personal
              information, subject to legal, contractual, or operational
              retention requirements.
            </p>

          </div>

        </div>

      </section>





      {/* INTERNATIONAL DATA */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-6xl px-6 py-20">

          <h2 className="text-4xl font-bold">
            International Data Processing
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            FinFlowTrack may use infrastructure and service providers located in
            different countries. Where information is processed internationally,
            we seek to apply appropriate safeguards designed to protect personal
            information in accordance with applicable legal requirements.
          </p>

        </div>

      </section>





      {/* CHILDREN */}

      <section className="container mx-auto max-w-6xl px-6 py-20">

        <h2 className="text-4xl font-bold">
          Children's Privacy
        </h2>

        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          FinFlowTrack is intended for business users and organizations.
          Our services are not directed toward children, and we do not
          knowingly collect personal information directly from children.
        </p>

      </section>





      {/* POLICY UPDATES */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-6xl px-6 py-20">

          <h2 className="text-4xl font-bold">
            Changes to This Privacy Policy
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            We may update this Privacy Policy from time to time to reflect
            improvements to FinFlowTrack, legal developments, or changes in our
            services. Material updates will be reflected by updating the
            effective date shown on this page.
          </p>

        </div>

      </section>





      {/* CONTACT */}

      <section className="container mx-auto max-w-6xl px-6 py-20">

        <div className="rounded-3xl border p-10">

          <Mail className="mb-6 h-12 w-12 text-primary"/>

          <h2 className="text-4xl font-bold">
            Contact Us
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            If you have questions about this Privacy Policy or wish to make a
            privacy-related request, please contact the FinFlowTrack team.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <div>

              <h3 className="font-semibold">
                General Support
              </h3>

              <p className="mt-2 text-muted-foreground">
                support@finflowtrack.com
              </p>

            </div>

            <div>

              <h3 className="font-semibold">
                Privacy Requests
              </h3>

              <p className="mt-2 text-muted-foreground">
                privacy@finflowtrack.com
              </p>

            </div>

          </div>

        </div>

      </section>





      {/* LAST UPDATED */}

      <section className="bg-muted/40">

        <div className="container mx-auto max-w-6xl px-6 py-16">

          <div className="rounded-2xl border bg-background p-8">

            <h2 className="text-2xl font-bold">
              Policy Information
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-2">

              <div>

                <h3 className="font-semibold">
                  Effective Date
                </h3>

                <p className="mt-2 text-muted-foreground">
                  July 2026
                </p>

              </div>

              <div>

                <h3 className="font-semibold">
                  Last Updated
                </h3>

                <p className="mt-2 text-muted-foreground">
                  July 2026
                </p>

              </div>

              <div>

                <h3 className="font-semibold">
                  Applies To
                </h3>

                <p className="mt-2 text-muted-foreground">
                  FinFlowTrack website, cloud platform, and related services.
                </p>

              </div>

              <div>

                <h3 className="font-semibold">
                  Questions?
                </h3>

                <Link
                  to="/contact"
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  Contact our team
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>





      {/* FINAL CTA */}

      <section className="border-t">

        <div className="container mx-auto max-w-5xl px-6 py-24 text-center">

          <h2 className="text-5xl font-bold">
            Privacy and Trust
            <br />
            Built Into FinFlowTrack
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground">
            We are committed to building accounting software that is secure,
            transparent, and designed with responsible data practices. As
            FinFlowTrack evolves, we will continue reviewing and improving our
            privacy practices to support our customers and meet applicable legal
            obligations.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">

            <Link
              to="/security"
              className="inline-flex items-center rounded-lg bg-primary px-8 py-4 text-primary-foreground"
            >
              Learn About Security

              <ArrowRight className="ml-2 h-4 w-4"/>

            </Link>

            <Link
              to="/contact"
              className="rounded-lg border px-8 py-4"
            >
              Contact Us
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}
