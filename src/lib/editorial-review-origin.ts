const FINFLOW_PREVIEW_HOST = /^finflow-stabilize-grow-[a-z0-9-]+-fin-flow-track\.vercel\.app$/i;

export function getEditorialReviewRedirectUrl(origin: string): string {
  const redirect = new URL("/editorial/review", origin);
  const hostname = redirect.hostname.toLowerCase();
  const isApprovedHost =
    hostname === "finflowtrack.com" ||
    hostname === "www.finflowtrack.com" ||
    FINFLOW_PREVIEW_HOST.test(hostname);

  if (redirect.protocol !== "https:" || !isApprovedHost) {
    throw new Error(
      "Open the deployed FinFlow Track preview URL before requesting a reviewer sign-in link.",
    );
  }

  return redirect.toString();
}
