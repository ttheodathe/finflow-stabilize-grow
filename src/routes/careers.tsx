import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/careers")({
  component: CareersPage,
  head: () => ({
    meta: [
      {
        title: "Careers at FinFlowTrack | Join Our Accounting SaaS Team",
      },
      {
        name: "description",
        content:
          "Explore careers at FinFlowTrack. Join a mission-driven team building modern accounting and business management software for growing businesses worldwide.",
      },
    ],
  }),
});

function CareersPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm font-semibold text-primary">Careers</p>

          <h1 className="mt-4 text-4xl font-bold md:text-6xl">
            Build the Future of Business Finance With FinFlowTrack
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Join a team building accessible accounting and business management technology that helps
            businesses understand their finances and grow with confidence.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <a href="#open-positions" className="rounded-lg bg-primary px-6 py-3 text-white">
              View Open Positions
            </a>

            <Link to="/about" className="rounded-lg border px-6 py-3">
              Learn About Us
            </Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-t py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Our Mission</h2>

          <p className="mt-5 leading-8 text-muted-foreground">
            FinFlowTrack exists to simplify financial management for entrepreneurs, freelancers,
            startups, and growing businesses. We build technology that makes accounting easier, more
            accessible, and more useful for everyday business decisions.
          </p>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Why Join FinFlowTrack?</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Meaningful Work",
                text: "Help build products that solve real financial challenges for businesses around the world.",
              },
              {
                title: "Innovation Culture",
                text: "Work on modern SaaS technology, automation, and tools that improve business operations.",
              },
              {
                title: "Growth Opportunity",
                text: "Grow your skills while contributing to an ambitious technology company.",
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

      {/* Culture */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Our Culture</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Customer First",
                text: "We focus on creating tools that genuinely help businesses succeed.",
              },
              {
                title: "Continuous Improvement",
                text: "We learn, experiment, and improve our products every day.",
              },
              {
                title: "Ownership",
                text: "We encourage responsibility, creativity, and independent thinking.",
              },
              {
                title: "Transparency",
                text: "We believe trust is built through clear communication and honest decisions.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-background border p-6">
                <h3 className="font-semibold">{item.title}</h3>

                <p className="mt-3 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teams */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Teams at FinFlowTrack</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              "Engineering",
              "Product & Design",
              "Marketing & Growth",
              "Customer Success",
              "Business Operations",
              "Finance",
            ].map((team) => (
              <div key={team} className="rounded-xl border p-6 text-center">
                {team}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="open-positions" className="border-t py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Open Positions</h2>

          <div className="mt-8 rounded-xl border p-8">
            <h3 className="text-xl font-semibold">We are growing our team</h3>

            <p className="mt-4 text-muted-foreground">
              Current openings will be listed here as new opportunities become available.
            </p>

            <p className="mt-4 text-muted-foreground">
              Interested in joining FinFlowTrack? Send your profile and experience to:
            </p>

            <a
              href="mailto:careers@finflowtrack.com"
              className="mt-4 inline-block font-semibold text-primary"
            >
              careers@finflowtrack.com
            </a>
          </div>
        </div>
      </section>

      {/* Hiring Process */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Our Hiring Process</h2>

          <div className="mt-8 space-y-5">
            {[
              "Application review",
              "Initial conversation",
              "Technical or role assessment",
              "Team interview",
              "Offer and onboarding",
            ].map((step, index) => (
              <div key={step} className="flex gap-4 rounded-xl border p-5">
                <span className="font-bold">{index + 1}</span>

                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>

          <div className="mt-8 space-y-6">
            {[
              [
                "Where is FinFlowTrack based?",
                "FinFlowTrack is based in Kigali, Rwanda, and builds cloud software for businesses worldwide.",
              ],
              [
                "Does FinFlowTrack offer remote opportunities?",
                "Remote opportunities may be available depending on the role and business needs.",
              ],
              [
                "How can I apply?",
                "Candidates can apply through available job listings or send their profile to careers@finflowtrack.com.",
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
        <h2 className="text-3xl font-bold">Help us build better financial tools</h2>

        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Join a team working to make business finance simpler and more accessible.
        </p>

        <a
          href="mailto:careers@finflowtrack.com"
          className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-white"
        >
          Contact Careers Team
        </a>
      </section>
      <SiteFooter />
    </main>
  );
}
