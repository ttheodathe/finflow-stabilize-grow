import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock,
  Headset,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      {
        title: "Contact | Get in Touch with FinFlowTrack",
      },
      {
        name: "description",
        content:
          "Contact the FinFlowTrack team by email, phone, or WhatsApp. We're here to help with support questions, sales inquiries, and everything in between.",
      },
    ],
  }),
});

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description:
      "Send us a message any time and our team will get back to you with a detailed response.",
    action: {
      label: "support@finflowtrack.com",
      href: "mailto:support@finflowtrack.com",
    },
  },
  {
    icon: Phone,
    title: "Call Us",
    description:
      "Speak directly with our team for urgent questions or a walkthrough of the platform.",
    action: {
      label: "+250 735 709 728",
      href: "tel:+250735709728",
    },
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description:
      "Message us on WhatsApp for a quick reply, wherever you're working from.",
    action: {
      label: "+250 735 709 728",
      href: "https://wa.me/250735709728",
    },
  },
];

const reasons = [
  {
    icon: Headset,
    title: "Product Support",
    description:
      "Get help using FinFlowTrack, from setting up your company to managing users and permissions.",
  },
  {
    icon: Building2,
    title: "Sales & Onboarding",
    description:
      "Talk to us about which plan fits your business and how to get your team set up quickly.",
  },
  {
    icon: ShieldCheck,
    title: "Security & Privacy",
    description:
      "Report a security concern or ask about how your business and financial data is protected.",
  },
  {
    icon: BadgeCheck,
    title: "General Questions",
    description:
      "Anything else on your mind, from billing to feature requests. We're happy to help.",
  },
];

const faqs = [
  {
    question: "What's the fastest way to reach you?",
    answer:
      "For urgent questions, calling or messaging us on WhatsApp at +250 735 709 728 is the fastest way to reach the team. For everything else, email works great.",
  },
  {
    question: "What are your support hours?",
    answer:
      "Our team is available during business hours and typically responds to emails within one business day. WhatsApp and phone inquiries are handled as soon as possible during working hours.",
  },
  {
    question: "Can I request a product demo?",
    answer:
      "Yes. Email support@finflowtrack.com or send us a WhatsApp message and we'll set up a time to walk you through the platform.",
  },
  {
    question: "How do I report a security issue?",
    answer:
      "Please email us directly and mark your message as security related. Our team prioritizes security reports and will respond promptly to investigate.",
  },
];

function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <header className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <Headset className="h-4 w-4 text-emerald-600" />
              Contact Us
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              We'd Love to Hear From You
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Whether you have a question about FinFlowTrack, need help with
              your account, or just want to talk to a real person, our team
              is ready to help by email, phone, or WhatsApp.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="mailto:support@finflowtrack.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Email Support
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/250735709728"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                Message on WhatsApp
              </a>
            </div>
          </header>
        </div>
      </section>

      {/* Contact Methods */}
      <section aria-labelledby="methods-heading" className="mx-auto max-w-6xl px-6 py-20">
        <h2 id="methods-heading" className="sr-only">
          Ways to reach FinFlowTrack
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {contactMethods.map((method) => (
            <article
              key={method.title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <method.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {method.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {method.description}
              </p>
              <a
                href={method.action.href}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {method.action.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* What can we help with */}
      <section aria-labelledby="reasons-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="reasons-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              What Can We Help With?
            </h2>
            <p className="mt-4 text-slate-600">
              No matter the reason you're reaching out, our team is ready to
              point you in the right direction.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => (
              <article
                key={reason.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <reason.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {reason.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {reason.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Details Card */}
      <section aria-labelledby="details-heading" className="mx-auto max-w-6xl px-6 py-20">
        <h2 id="details-heading" className="sr-only">
          Contact details
        </h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Mail className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Email
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              For support requests, sales questions, or anything else, email
              is the best way to reach the full team.
            </p>
            <a
              href="mailto:support@finflowtrack.com"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              support@finflowtrack.com
            </a>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Call or WhatsApp
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Prefer to talk? Call us directly or send a message on WhatsApp
              for a quick response.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a
                href="tel:+250735709728"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
              >
                +250 735 709 728
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="https://wa.me/250735709728"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* Response Time */}
      <section aria-labelledby="response-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Clock className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 id="response-heading" className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            We Respond Quickly
          </h2>
          <p className="mt-3 text-slate-600">
            Emails are typically answered within one business day. For
            faster responses, call or message us on WhatsApp during working
            hours.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto max-w-4xl px-6 py-20">
        <h2 id="faq-heading" className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Frequently Asked Questions
        </h2>
        <div className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Let's Talk
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Reach out however works best for you. Our team is ready to help
            you get the most out of FinFlowTrack.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:support@finflowtrack.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Email Us
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/250735709728"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
