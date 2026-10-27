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
          "Explore careers at FinFlowTrack. Now hiring Growth & Marketing Partners worldwide (commission-based, applications reviewed on a rolling basis).",
      },
    ],
  }),
});

const APPLY_MAILTO =
  "mailto:ceo@finflowtrack.com?subject=" +
  encodeURIComponent("Application — Growth & Marketing Partner");

const backgrounds = [
  "Bookkeeping",
  "Accounting",
  "Finance",
  "Small-business advisory",
  "Business development",
  "SaaS",
  "Digital marketing",
];

const responsibilities = [
  "Identify and connect with potential customers",
  "Explain the value of FinFlow Track",
  "Build relationships through channels you already use",
];

const channels = [
  "Professional networks",
  "Business communities",
  "Content",
  "Partnerships",
  "Email outreach",
  "Your existing network",
  "Social media",
];

const goodFit = [
  "Explain software clearly",
  "Identify genuine customer needs",
  "Reach the right audience",
  "Build professional relationships",
  "Work independently",
  "Communicate consistently",
  "Focus on qualified customers, not spam",
];

const commissionTiers = [
  { rate: "20%", range: "1–10 qualified referrals" },
  { rate: "35%", range: "11–49 qualified referrals" },
  { rate: "50%", range: "50+ qualified referrals" },
];

const applicationIncludes = [
  "Your name",
  "Your country",
  "Relevant experience",
  "The channels you would use",
  "A short note on how you’d approach customer acquisition",
];

/** Professional "HIRING" status pill. Static, no animation. */
function HiringBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ${className}`}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
      We&rsquo;re hiring
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CareersPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm font-semibold text-primary">Careers</p>
            <HiringBadge />
          </div>

          <h1 className="mt-4 text-4xl font-bold md:text-6xl">
            Build the Future of Business Finance With FinFlowTrack
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Join a team building accessible accounting and business management technology that helps
            businesses understand their finances and grow with confidence.
          </p>

          <p className="mx-auto mt-6 max-w-xl rounded-lg border border-emerald-600/30 bg-emerald-50/60 px-4 py-3 text-sm text-foreground dark:bg-emerald-950/20">
            <strong>Now hiring:</strong> Growth &amp; Marketing Partners worldwide. Applications are
            reviewed on a rolling basis.
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
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold">Open Positions</h2>
            <HiringBadge />
          </div>

          <article className="mt-8 rounded-xl border p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <HiringBadge />
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">Worldwide</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                Commission-based
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                Independent partner
              </span>
            </div>

            <h3 className="mt-5 text-2xl font-bold">Growth &amp; Marketing Partners</h3>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Turn your financial knowledge into a real income opportunity by helping businesses
              find better financial tools. Help us reach businesses that genuinely need better
              financial-management tools.
            </p>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h4 className="font-semibold">Who we’re looking for</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  We’re especially interested in people already working in or around:
                </p>
                <BulletList items={backgrounds} />
              </div>

              <div>
                <h4 className="font-semibold">What you’ll do</h4>
                <BulletList items={responsibilities} />
                <p className="mt-4 text-sm font-medium">This could mean:</p>
                <BulletList items={channels} />
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h4 className="font-semibold">Why bookkeepers &amp; accounting professionals?</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Because you already understand the problems: you see the spreadsheets, the unpaid
                  invoices and the expense records, and you understand what businesses struggle
                  with. That knowledge is valuable.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Are you a good fit?</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  You may be a strong fit if you can:
                </p>
                <BulletList items={goodFit} />
                <p className="mt-3 text-sm font-medium">
                  You don’t need a formal marketing degree.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="font-semibold">Commission tiers</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {commissionTiers.map((t) => (
                  <div key={t.rate} className="rounded-lg border bg-muted/30 p-4">
                    <div className="text-2xl font-bold text-primary">{t.rate}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t.range}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Eligible commissions can continue for up to 15 months.
              </p>
              <p className="mt-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">
                  This is a commission-based independent opportunity, not a salaried position.
                </strong>{" "}
                There is no fixed salary. Earnings depend on eligible customer acquisition and
                applicable commission terms.
              </p>
            </div>

            <div className="mt-8 rounded-lg border-2 border-primary/30 p-6">
              <h4 className="text-lg font-semibold">How to apply</h4>
              <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Applications are reviewed on a rolling basis.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Email{" "}
                <a href={APPLY_MAILTO} className="font-semibold text-primary underline">
                  ceo@finflowtrack.com
                </a>{" "}
                with the subject “Application — Growth &amp; Marketing Partner” and include:
              </p>
              <BulletList items={applicationIncludes} />

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <a
                  href={APPLY_MAILTO}
                  className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white"
                >
                  Apply now
                </a>
                <p className="text-sm text-muted-foreground">
                  Questions about the role or commission details? Email{" "}
                  <a href="mailto:support@finflowtrack.com" className="font-semibold text-primary">
                    support@finflowtrack.com
                  </a>
                </p>
              </div>
            </div>
          </article>

          <div className="mt-8 rounded-xl border p-8">
            <h3 className="text-xl font-semibold">Other roles</h3>

            <p className="mt-4 text-muted-foreground">
              Interested in joining FinFlowTrack in another capacity? Send your profile and
              experience to:
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
