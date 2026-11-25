import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BUSINESS_TYPES = [
  ["small_business", "Small business"],
  ["freelancer", "Freelancer / independent professional"],
  ["startup", "Startup"],
  ["nonprofit", "Nonprofit / NGO"],
  ["agency", "Agency / professional services firm"],
  ["other", "Other"],
] as const;

const PREFERRED_TIMES = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["flexible", "I'm flexible"],
] as const;

type FormState = {
  fullName: string;
  businessName: string;
  email: string;
  businessType: string;
  challenge: string;
  preferredTime: string;
  phone: string;
  demoContactConsent: boolean;
  marketingConsent: boolean;
  website: string;
};

const INITIAL_FORM: FormState = {
  fullName: "",
  businessName: "",
  email: "",
  businessType: "",
  challenge: "",
  preferredTime: "flexible",
  phone: "",
  demoContactConsent: false,
  marketingConsent: false,
  website: "",
};

export function DemoRequestForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "We couldn't submit your request. Please try again.");
      }
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't submit your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
        <h3 className="mt-4 text-xl font-semibold text-slate-900">Your demo request is received</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Thanks for your interest in FinFlowTrack. Our team will review your request and contact
          you using the details you provided.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => setSubmitted(false)}>
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="demo-full-name">Your name *</Label>
          <Input
            id="demo-full-name"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-business-name">Business / organization *</Label>
          <Input
            id="demo-business-name"
            name="businessName"
            required
            minLength={2}
            maxLength={160}
            value={form.businessName}
            onChange={(event) => update("businessName", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-email">Work email *</Label>
          <Input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-phone">Phone (optional)</Label>
          <Input
            id="demo-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-business-type">Business type *</Label>
          <select
            id="demo-business-type"
            name="businessType"
            required
            value={form.businessType}
            onChange={(event) => update("businessType", event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Choose a business type
            </option>
            {BUSINESS_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-preferred-time">Preferred time *</Label>
          <select
            id="demo-preferred-time"
            name="preferredTime"
            required
            value={form.preferredTime}
            onChange={(event) => update("preferredTime", event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PREFERRED_TIMES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-challenge">What would you like help with? *</Label>
        <Textarea
          id="demo-challenge"
          name="challenge"
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          value={form.challenge}
          onChange={(event) => update("challenge", event.target.value)}
          placeholder="Tell us briefly about your current accounting or financial management workflow."
        />
        <p className="text-xs text-muted-foreground">20–2,000 characters.</p>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <Label htmlFor="demo-website">Leave this field empty</Label>
        <Input
          id="demo-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="demo-contact-consent"
            checked={form.demoContactConsent}
            onCheckedChange={(checked) => update("demoContactConsent", checked === true)}
            required
          />
          <Label htmlFor="demo-contact-consent" className="text-sm font-normal leading-relaxed">
            I agree that FinFlowTrack may contact me about this demo request using the information I
            provided. *
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="demo-marketing-consent"
            checked={form.marketingConsent}
            onCheckedChange={(checked) => update("marketingConsent", checked === true)}
          />
          <Label htmlFor="demo-marketing-consent" className="text-sm font-normal leading-relaxed">
            I'd also like to receive occasional product updates and educational emails. This is
            optional and is not required to request a demo.
          </Label>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Your demo details are used to respond to this request. Read our{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending request...
          </>
        ) : (
          "Request my demo"
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No payment details required. Requesting a demo does not create an account or subscription.
      </p>
    </form>
  );
}
