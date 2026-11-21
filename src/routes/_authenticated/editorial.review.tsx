import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, RefreshCw, FileText } from "lucide-react";

type EditorialReview = {
  operation_id: string;
  revision_id: string;
  slug: string;
  target_path: string;
  operation_status: string;
  revision_number: number;
  content_hash: string;
  markdown: string;
  created_at: string;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/editorial/review")({
  head: () => ({ meta: [{ title: "Editorial Review — FinFlow Track" }] }),
  component: EditorialReviewPage,
});

async function loadReviewQueue(): Promise<EditorialReview[]> {
  const { data, error } = await supabase.functions.invoke("seo-editorial-approval", {
    body: { action: "list" },
  });
  if (error) throw new Error(error.message || "Could not load the editorial review queue.");
  if (data?.error) throw new Error(data.error);
  return Array.isArray(data?.reviews) ? data.reviews : [];
}

function EditorialReviewPage() {
  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["seo-editorial-review-queue"],
    queryFn: loadReviewQueue,
    retry: false,
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function decide(review: EditorialReview, decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED") {
    setSubmitting(review.revision_id);
    try {
      const { data, error } = await supabase.functions.invoke("seo-editorial-approval", {
        body: {
          operationId: review.operation_id,
          revisionId: review.revision_id,
          contentHash: review.content_hash,
          decision,
          reviewNotes: notes[review.revision_id] ?? "",
        },
      });
      if (error) throw new Error(error.message || "Editorial decision failed.");
      if (data?.error) throw new Error(data.error);
      if (data?.contentHash !== review.content_hash || data?.decision !== decision) {
        throw new Error("The server did not confirm the exact revision and decision.");
      }
      toast.success(
        decision === "APPROVED"
          ? "Revision approved as a draft. Nothing was published."
          : decision === "CHANGES_REQUESTED"
            ? "Changes requested and decision recorded."
            : "Revision rejected and decision recorded.",
      );
      await queryClient.invalidateQueries({ queryKey: ["seo-editorial-review-queue"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Editorial decision failed.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editorial review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the exact stored article revision before it can move forward.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh queue
        </Button>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Draft-only review</AlertTitle>
        <AlertDescription>
          Approval records an editorial decision for this exact revision. It does not publish,
          deploy, or write to the public blog.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Review queue unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {error.message.includes("authorized")
                ? "Your signed-in account is not on the active editorial reviewer allowlist."
                : error.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Access is checked by the server for every request. Being signed in to FinFlow Track
              does not automatically grant editorial privileges.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No articles awaiting review</p>
            <p className="text-sm text-muted-foreground">
              Eligible article revisions will appear here when the research pipeline persists them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <Card key={review.revision_id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">{review.slug}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Revision {review.revision_number}</Badge>
                    <Badge variant="outline">{review.operation_status}</Badge>
                    <Badge variant="outline">Draft only</Badge>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Target: {review.target_path}</p>
                  <p className="break-all">SHA-256: {review.content_hash}</p>
                  <p>Updated: {new Date(review.updated_at).toLocaleString()}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[560px] overflow-auto rounded-md border bg-muted/20 p-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6">
                    {review.markdown}
                  </pre>
                </div>
                <div className="space-y-2">
                  <label htmlFor={`notes-${review.revision_id}`} className="text-sm font-medium">
                    Editorial notes
                  </label>
                  <Textarea
                    id={`notes-${review.revision_id}`}
                    value={notes[review.revision_id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [review.revision_id]: event.target.value,
                      }))
                    }
                    placeholder="Record evidence gaps, corrections, or requested changes..."
                    rows={3}
                    maxLength={4000}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void decide(review, "APPROVED")}
                    disabled={submitting !== null}
                  >
                    {submitting === review.revision_id ? "Saving..." : "Approve draft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void decide(review, "CHANGES_REQUESTED")}
                    disabled={submitting !== null}
                  >
                    Request changes
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void decide(review, "REJECTED")}
                    disabled={submitting !== null}
                  >
                    Reject revision
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
