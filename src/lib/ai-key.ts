// Resolves the Gemini API key on the server.
// The key lives in process.env in most runtimes, but some edge/worker runtimes
// expose bindings elsewhere — check every known location before failing so AI
// features don't break with a confusing "missing key" error.
export function getGeminiApiKey(): string {
  const g = globalThis as unknown as Record<string, any>;
  const candidates: unknown[] = [
    typeof process !== "undefined" ? process?.env?.GEMINI_API_KEY : undefined,
    g?.process?.env?.GEMINI_API_KEY,
    g?.env?.GEMINI_API_KEY,
    g?.__env__?.GEMINI_API_KEY,
    g?.GEMINI_API_KEY,
  ];
  const key = candidates.find((v) => typeof v === "string" && v.length > 0);
  if (!key) {
    throw new Error(
      "AI features are unavailable: the server could not read GEMINI_API_KEY. Set it in your deployment's environment variables and redeploy.",
    );
  }
  return key as string;
}

// Kept as an alias so any remaining call sites (or future merges from Lovable)
// don't silently break — remove once every caller has migrated.
export const getLovableApiKey = getGeminiApiKey;
