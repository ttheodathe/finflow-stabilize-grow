import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, HandCoins, Loader2, Link2, ShieldCheck, Wallet } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { submitPartnerApplication } from "@/services/partners/partnerApplications.service";
import { PARTNER_TYPE_LABELS, type PartnerType } from "@/types/partner.types";

export const Route = createFileRoute("/partners/apply")({
  component: BecomeAPartnerPage,
  head: () => ({
    meta: [
      { title: "Become a Partner | FinFlowTrack" },
      {
        name: "description",
        content:
          "Join the FinFlowTrack Partner Program and earn a 20% recurring commission on every subscription you refer, for as long as it stays active. Open to affiliates, firms, accountants, consultants, educators, and resellers.",
      },
    ],
  }),
});

const PARTNER_TYPES = Object.entries(PARTNER_TYPE_LABELS) as [PartnerType, string][];

function BecomeAPartnerPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    partnerType: "" as PartnerType | "",
    businessName: "",
    website: "",
    country: "",
    industry: "",
    businessType: "",
    linkedinUrl: "",
    contactEmail: "",
    phone: "",
    monthlyAudience: "",
    approxClients: "",
    motivation: "",
    experience: "",
    marketingChannels: "",
    termsAccepted: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partnerType) return toast.error("Please select a partner type");
    if (!form.termsAccepted) return toast.error("Please accept the partner terms");

    setSubmitting(true);
    try {
      await submitPartnerApplication({
        partnerType: form.partnerType,
        businessName: form.businessName,
        website: form.website || undefined,
        country: form.country,
        industry: form.industry || undefined,
        businessType: form.businessType || undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        contactEmail: form.contactEmail,
        phone: form.phone || undefined,
        monthlyAudience: form.monthlyAudience || undefined,
        approxClients: form.approxClients || undefined,
        motivation: form.motivation || undefined,
        experience: form.experience || undefined,
        marketingChannels: form.marketingChannels
          ? form.marketingChannels
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        termsAccepted: form.termsAccepted,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <HandCoins className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Become a FinFlowTrack Partner
            </h1>
            <p className="mt-4 text-muted-foreground">
              Refer bookkeeping and accounting clients to FinFlowTrack and earn recurring
              commissions on every subscription that stays active. Open to affiliates, firms,
              accountants, consultants, educators, and resellers.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-2xl font-bold text-primary">20%</div>
                <div className="mt-1 text-xs text-muted-foreground">Recurring commission</div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-2xl font-bold text-primary">8</div>
                <div className="mt-1 text-xs text-muted-foreground">Partner types welcome</div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-2xl font-bold text-primary">Manual</div>
                <div className="mt-1 text-xs text-muted-foreground">Fraud-checked commissions</div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-2xl font-bold text-primary">Kigali</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <Link to="/about" className="underline hover:text-foreground">
                    2005CLG Ltd, Rwanda
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold">How the partner program works</h2>
            <p className="mt-2 text-muted-foreground">
              No hidden terms — here's exactly how referrals, commissions, and payouts work.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">1. Share your referral link</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Once approved, you get a unique referral link. We track who clicks it using
                last-touch attribution — the partner whose link a customer clicked most recently
                gets credit for that referral.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">2. Your referral subscribes</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When someone you referred makes a paid subscription, a commission is recorded as
                pending. Every commission is checked for obvious signs of abuse (e.g. an
                implausibly fast signup-to-payment) before it's approved — this protects genuine
                partners' payouts.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">3. You earn 20%, recurring</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You earn 20% of what your referral pays FinFlowTrack, for as long as their
                subscription stays active — not just a one-time bounty. Approved commissions are
                paid out by our team; you can track pending, approved, and paid amounts in your
                partner dashboard at any time.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="mb-4 text-center text-lg font-semibold">Common questions</h3>
            <Accordion type="single" collapsible className="mx-auto max-w-2xl">
              <AccordionItem value="rate">
                <AccordionTrigger>How much do I actually earn per referral?</AccordionTrigger>
                <AccordionContent>
                  20% of the subscription payments your referral makes to FinFlowTrack, for as
                  long as they remain a paying customer. This is a recurring commission, not a
                  flat one-time fee.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tracking">
                <AccordionTrigger>How is my referral tracked?</AccordionTrigger>
                <AccordionContent>
                  Through your unique referral link, using last-touch attribution — whoever's
                  link a customer clicked most recently before signing up gets credit for that
                  referral.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="review">
                <AccordionTrigger>Why are commissions reviewed before approval?</AccordionTrigger>
                <AccordionContent>
                  Every new commission is automatically screened for patterns that suggest abuse
                  — like a signup converting to a paid plan almost instantly, or an unusually high
                  volume of new referrals from one partner in a short period. Flagged commissions
                  get a human review rather than automatic rejection, so legitimate partners are
                  never penalized by the check.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="payout">
                <AccordionTrigger>When and how do I get paid?</AccordionTrigger>
                <AccordionContent>
                  There's no fixed automatic schedule — our team reviews and processes payouts
                  for your approved commissions, and you can see the status of every commission
                  (pending, approved, or paid) in your partner dashboard at any time.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="who">
                <AccordionTrigger>Who is behind FinFlowTrack?</AccordionTrigger>
                <AccordionContent>
                  FinFlowTrack is operated by 2005CLG Ltd, registered in Kigali, Rwanda. You can
                  read more about the company on our{" "}
                  <Link to="/about" className="underline hover:text-foreground">
                    About page
                  </Link>
                  .
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-xl font-semibold">Application received</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Thanks for applying to the FinFlowTrack Partner Program. Our team reviews
                applications within a few business days and will reach out at the email you
                provided.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="partnerType">Partner type *</Label>
                  <Select
                    value={form.partnerType}
                    onValueChange={(v) => update("partnerType", v as PartnerType)}
                  >
                    <SelectTrigger id="partnerType">
                      <SelectValue placeholder="Select the type that best fits you" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business / your name *</Label>
                  <Input
                    id="businessName"
                    required
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    required
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={form.industry}
                    onChange={(e) => update("industry", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business type</Label>
                  <Input
                    id="businessType"
                    placeholder="e.g. Sole proprietor, LLC, Agency"
                    value={form.businessType}
                    onChange={(e) => update("businessType", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedinUrl}
                    onChange={(e) => update("linkedinUrl", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    required
                    value={form.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyAudience">Monthly audience / reach</Label>
                  <Input
                    id="monthlyAudience"
                    placeholder="e.g. 5,000 newsletter subscribers"
                    value={form.monthlyAudience}
                    onChange={(e) => update("monthlyAudience", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approxClients">Approximate clients you serve</Label>
                  <Input
                    id="approxClients"
                    placeholder="e.g. 20-30 bookkeeping clients"
                    value={form.approxClients}
                    onChange={(e) => update("approxClients", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Why do you want to partner with FinFlowTrack?</Label>
                <Textarea
                  id="motivation"
                  rows={3}
                  value={form.motivation}
                  onChange={(e) => update("motivation", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Relevant experience</Label>
                <Textarea
                  id="experience"
                  rows={3}
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketingChannels">
                  Marketing channels{" "}
                  <span className="font-normal text-muted-foreground">(comma-separated)</span>
                </Label>
                <Input
                  id="marketingChannels"
                  placeholder="e.g. Email, YouTube, LinkedIn"
                  value={form.marketingChannels}
                  onChange={(e) => update("marketingChannels", e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="termsAccepted"
                  checked={form.termsAccepted}
                  onCheckedChange={(v) => update("termsAccepted", v === true)}
                />
                <Label htmlFor="termsAccepted" className="text-sm font-normal leading-snug">
                  I agree to the FinFlowTrack Partner Program terms and understand my application
                  will be reviewed before approval.
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit application"
                )}
              </Button>
            </form>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
