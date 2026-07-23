import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/press")({
  component: PressPage,
  head: () => ({
    meta: [
      {
        title: "FinFlowTrack Press | News, Media Resources & Company Information",
      },
      {
        name: "description",
        content:
          "Discover FinFlowTrack company news, announcements, media resources, and information about our accounting and business management platform.",
      },
    ],
  }),
});

function PressPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-4 text-sm font-semibold text-primary">Media & Company News</p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">FinFlowTrack Press</h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            News, announcements, company information, and media resources about FinFlowTrack — a
            modern accounting and business management platform helping businesses manage their
            finances with confidence.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="mailto:press@finflowtrack.com"
              className="rounded-lg bg-primary px-6 py-3 text-white"
            >
              Media Contact
            </a>

            <Link to="/about" className="rounded-lg border px-6 py-3">
              About FinFlowTrack
            </Link>
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="border-t py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">About FinFlowTrack</h2>

          <p className="mt-5 text-muted-foreground leading-8">
            FinFlowTrack is a cloud-based accounting and business management platform designed to
            help freelancers, startups, small businesses, and growing organizations manage their
            financial operations.
          </p>

          <p className="mt-4 text-muted-foreground leading-8">
            The platform brings essential business tools together, including invoicing, expense
            tracking, inventory management, financial reporting, and team collaboration.
          </p>
        </div>
      </section>

      {/* Mission Vision */}
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-2">
          <div className="rounded-xl border p-8">
            <h3 className="text-xl font-semibold">Our Mission</h3>

            <p className="mt-4 text-muted-foreground">
              Make financial management simpler, more accessible, and easier for businesses of all
              sizes.
            </p>
          </div>

          <div className="rounded-xl border p-8">
            <h3 className="text-xl font-semibold">Our Vision</h3>

            <p className="mt-4 text-muted-foreground">
              Help businesses make better decisions through accessible financial technology and
              intelligent business tools.
            </p>
          </div>
        </div>
      </section>

      {/* Company Facts */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Company Facts</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["Company", "FinFlowTrack"],
              ["Founded", "2026"],
              ["Headquarters", "Kigali, Rwanda"],
              ["Industry", "Financial Technology / SaaS"],
              ["Product", "Accounting & Business Management Software"],
              ["Category", "Cloud SaaS Platform"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-background p-6">
                <p className="text-sm text-muted-foreground">{label}</p>

                <p className="mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Media Resources</h2>

          <p className="mt-4 text-muted-foreground">
            Resources for journalists, partners, and organizations interested in learning more about
            FinFlowTrack.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Brand Assets",
                text: "Logos, brand information, and visual resources.",
              },
              {
                title: "Company Information",
                text: "Background information about FinFlowTrack and our mission.",
              },
              {
                title: "Product Resources",
                text: "Platform information, screenshots, and feature details.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border p-6">
                <h3 className="font-semibold">{item.title}</h3>

                <p className="mt-3 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Press Releases</h2>

          <article className="mt-8 rounded-xl border bg-background p-8">
            <p className="text-sm text-muted-foreground">July 2026</p>

            <h3 className="mt-3 text-xl font-semibold">
              FinFlowTrack Launches Its Accounting Platform for Growing Businesses
            </h3>

            <p className="mt-4 text-muted-foreground leading-7">
              FinFlowTrack introduces a modern accounting platform designed to help businesses
              manage invoices, expenses, inventory, and financial operations from one place.
            </p>
          </article>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Our Story</h2>

          <p className="mt-5 text-muted-foreground leading-8">
            FinFlowTrack was created to address the challenges many businesses face when managing
            financial information, operational records, and business growth.
          </p>

          <p className="mt-4 text-muted-foreground leading-8">
            Our goal is to build accessible financial technology that helps entrepreneurs and
            organizations understand their numbers and make informed decisions.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>

          <div className="mt-8 space-y-6">
            {[
              [
                "What is FinFlowTrack?",
                "FinFlowTrack is an accounting and business management platform designed to help businesses manage finances, invoices, expenses, inventory, and operations.",
              ],
              [
                "Who uses FinFlowTrack?",
                "FinFlowTrack is designed for freelancers, startups, small businesses, SMEs, and organizations that need better financial management tools.",
              ],
              [
                "Where is FinFlowTrack based?",
                "FinFlowTrack is based in Kigali, Rwanda, and serves businesses through a cloud-based platform.",
              ],
              [
                "How can journalists contact FinFlowTrack?",
                "Media inquiries can be sent to press@finflowtrack.com.",
              ],
            ].map(([question, answer]) => (
              <div key={question}>
                <h3 className="font-semibold">{question}</h3>

                <p className="mt-2 text-muted-foreground">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold">Interested in learning more about FinFlowTrack?</h2>

        <div className="mt-8 flex justify-center gap-4">
          <Link to="/contact" className="rounded-lg bg-primary px-6 py-3 text-white">
            Contact Us
          </Link>

          <Link to="/pricing" className="rounded-lg border px-6 py-3">
            Explore Product
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
