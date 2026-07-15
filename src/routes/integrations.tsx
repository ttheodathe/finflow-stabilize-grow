import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/integrations")({
  component: IntegrationsPage,
  head: () => ({
    meta: [
      {
        title: "FinFlowTrack Integrations | Connect Your Business Tools",
      },
      {
        name: "description",
        content:
          "Explore FinFlowTrack integrations and future connections designed to help businesses automate workflows, manage data, and improve financial operations.",
      },
    ],
  }),
});

function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm font-semibold text-primary">Integrations</p>

          <h1 className="mt-4 text-4xl font-bold md:text-6xl">
            Connect FinFlowTrack With Your Business Tools
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Build a connected business workflow by bringing your financial operations, productivity
            tools, and business systems together.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link to="/pricing" className="rounded-lg bg-primary px-6 py-3 text-white">
              View Plans
            </Link>

            <Link to="/contact" className="rounded-lg border px-6 py-3">
              Request Integration
            </Link>
          </div>
        </div>
      </section>

      {/* Why Integrations */}
      <section className="border-t py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Why Integrations Matter</h2>

          <p className="mt-5 leading-8 text-muted-foreground">
            Businesses use multiple tools every day. FinFlowTrack is designed to help businesses
            create connected workflows by reducing manual data entry, improving accuracy, and making
            financial information easier to manage.
          </p>
        </div>
      </section>

      {/* Integration Categories */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Integration Categories</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Payments",
                text: "Connect payment workflows and keep financial records organized.",
              },
              {
                title: "Banking",
                text: "Simplify financial data management through future banking connections.",
              },
              {
                title: "Productivity",
                text: "Connect business workflows with tools your team already uses.",
              },
              {
                title: "CRM",
                text: "Improve customer information management and sales workflows.",
              },
              {
                title: "E-commerce",
                text: "Support online businesses managing orders and finances.",
              },
              {
                title: "Automation",
                text: "Reduce repetitive tasks through connected workflows.",
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

      {/* Available Integrations */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Available Integrations</h2>

          <p className="mt-4 text-muted-foreground">
            Current integrations will appear here as they become available.
          </p>

          <div className="mt-8 rounded-xl border bg-background p-8">
            <h3 className="font-semibold">FinFlowTrack Platform</h3>

            <p className="mt-3 text-muted-foreground">
              Built-in modules including accounting, invoicing, expenses, inventory, reporting, and
              company management.
            </p>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Coming Soon</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              "Payment Providers",
              "Bank Connections",
              "E-commerce Platforms",
              "CRM Systems",
              "Automation Tools",
              "Business APIs",
            ].map((item) => (
              <div key={item} className="rounded-xl border p-6">
                <h3 className="font-semibold">{item}</h3>

                <p className="mt-3 text-sm text-muted-foreground">Planned ecosystem expansion.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Developer & API Ecosystem</h2>

          <p className="mt-5 leading-8 text-muted-foreground">
            Future FinFlowTrack integrations will allow businesses and developers to connect
            external applications, automate workflows, and build customized financial solutions.
          </p>

          <div className="mt-6 rounded-xl border bg-background p-6">
            <h3 className="font-semibold">API Access</h3>

            <p className="mt-3 text-muted-foreground">
              Developer tools and API documentation will become available as the platform ecosystem
              grows.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Built For Growing Businesses</h2>

          <p className="mt-5 text-muted-foreground leading-8">
            Whether you are a freelancer, startup, small business, or growing organization,
            FinFlowTrack is designed to support flexible financial workflows that grow with your
            needs.
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
                "What integrations does FinFlowTrack support?",
                "Available integrations will be listed as they are officially released.",
              ],
              [
                "Can I request a new integration?",
                "Yes. Businesses can contact FinFlowTrack with integration requests.",
              ],
              [
                "Will FinFlowTrack provide an API?",
                "API capabilities are planned as the platform ecosystem develops.",
              ],
            ].map(([q, a]) => (
              <div key={q}>
                <h3 className="font-semibold">{q}</h3>

                <p className="mt-2 text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold">Need a specific integration?</h2>

        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Tell us what tools your business uses and help shape future FinFlowTrack integrations.
        </p>

        <a
          href="mailto:support@finflowtrack.com"
          className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-white"
        >
          Request Integration
        </a>
      </section>
    </main>
  );
}
