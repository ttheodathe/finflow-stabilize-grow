import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Quote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/testimonials")({
  component: TestimonialsPage,

  head: () => ({
    meta: [
      { title: "Customer Reviews | FinFlowTrack" },
      {
        name: "description",
        content:
          "See what freelancers, startups, and small businesses say about FinFlowTrack, and leave your own review.",
      },
    ],
  }),
});

// Row shape for the `public.testimonials` table. Once you've run the
// migration and regenerated Supabase types (`supabase gen types
// typescript`), you can delete this and import the generated type instead.
type Testimonial = {
  id: string;
  name: string;
  role_company: string | null;
  rating: number;
  message: string;
  created_at: string;
};

function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("testimonials")
        // remove `as any` once types.ts has been regenerated to include
        // the new table
        .select("id, name, role_company, rating, message, created_at")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error(error);
      } else {
        setTestimonials((data as unknown as Testimonial[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-background">
      <SiteHeader />

      <section className="border-b">
        <div className="container mx-auto max-w-5xl px-6 py-20 text-center">
          <Badge variant="secondary" className="mb-4">
            Customer Reviews
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            What our customers say
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Real feedback from freelancers, startups, and small businesses using FinFlowTrack.
            Used it yourself? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Leave a review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviews are checked before they go live, so yours may take a little while to appear.
        </p>
        <div className="mt-6 max-w-xl">
          <TestimonialForm />
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold">
            {loading ? "Loading reviews…" : `${testimonials.length} review${testimonials.length === 1 ? "" : "s"}`}
          </h2>

          {loading ? (
            <div className="mt-8 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : testimonials.length === 0 ? (
            <p className="mt-8 text-muted-foreground">
              No reviews yet — be the first to leave one above.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {testimonials.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < testimonial.rating
                  ? "fill-primary text-primary"
                  : "fill-muted text-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Quote className="mb-2 h-5 w-5 text-muted-foreground/40" />
        <p className="text-sm leading-relaxed text-foreground/90">{testimonial.message}</p>
        <div className="mt-4 text-sm font-medium">{testimonial.name}</div>
        {testimonial.role_company && (
          <div className="text-xs text-muted-foreground">{testimonial.role_company}</div>
        )}
      </CardContent>
    </Card>
  );
}

function TestimonialForm() {
  const [name, setName] = useState("");
  const [roleCompany, setRoleCompany] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !message.trim()) {
      toast.error("Please fill in your name and review.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("testimonials").insert({
      name: name.trim(),
      role_company: roleCompany.trim() || null,
      rating,
      message: message.trim(),
      approved: false,
    });
    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
      return;
    }

    toast.success("Thanks! Your review is pending approval and will appear here soon.");
    setName("");
    setRoleCompany("");
    setMessage("");
    setRating(5);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="rating">Rating</Label>
        <div id="rating" className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            const filled = (hoverRating ?? rating) >= value;
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-0.5"
              >
                <Star
                  className={`h-6 w-6 transition-colors ${
                    filled ? "fill-primary text-primary" : "fill-muted text-muted-foreground/40"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleCompany">Role / company (optional)</Label>
        <Input
          id="roleCompany"
          value={roleCompany}
          onChange={(e) => setRoleCompany(e.target.value)}
          placeholder="Founder, Acme Co."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Your review</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you think of FinFlowTrack…"
          rows={5}
          maxLength={2000}
          required
        />
      </div>

      <Button type="submit" disabled={submitting} className="bg-gradient-hero shadow-glow hover:opacity-95">
        {submitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
