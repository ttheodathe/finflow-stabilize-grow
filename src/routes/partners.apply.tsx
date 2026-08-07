import { createFileRoute } from "@tanstack/react-router";
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
import { CheckCircle2, HandCoins, Loader2, Users2 } from "lucide-react";
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
          "Join the FinFlowTrack Partner Program. Earn recurring commissions referring bookkeeping and accounting clients to free, modern accounting software.",
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
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users2 className="h-4 w-4" /> All partner types welcome
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Recurring commissions
              </span>
            </div>
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
