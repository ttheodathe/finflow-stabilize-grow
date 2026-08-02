// Resolves the Lovable AI Gateway key on the server.
// The key lives in process.env in most runtimes, but some edge/worker runtimes
// expose bindings elsewhere — check every known location before failing so AI
// features don't break with a confusing "missing key" error.
export function getLovableApiKey(): string {
  const g = globalThis as unknown as Record<string, any>;
  const candidates: unknown[] = [
    typeof process !== "undefined" ? process?.env?.LOVABLE_API_KEY : undefined,
    g?.process?.env?.LOVABLE_API_KEY,
    g?.env?.LOVABLE_API_KEY,
    g?.__env__?.LOVABLE_API_KEY,
    g?.LOVABLE_API_KEY,
  ];
  const key = candidates.find((v) => typeof v === "string" && v.length > 0);
  if (!key) {
    throw new Error(
      "AI features are unavailable: the server could not read LOVABLE_API_KEY. If this happens on the published site, re-publish so the latest secrets are deployed.",
    );
  }
  return key as string;
}
