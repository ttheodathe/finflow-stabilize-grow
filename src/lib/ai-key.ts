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

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// Centralized caller for Gemini's OpenAI-compatible chat/completions endpoint.
// Google's backend occasionally returns 503 UNAVAILABLE under load ("This
// model is currently experiencing high demand") — this is transient and
// almost always succeeds on a quick retry, so we retry a couple of times
// with backoff before surfacing an error to the user. 429 (rate limit) and
// 402 (out of credits) are NOT retried since retrying won't help either.
export async function callGeminiChatCompletion(body: Record<string, unknown>, key: string): Promise<string> {
  const maxAttempts = 3;
  let lastErrorBody = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      const choice = json.choices?.[0];
      if (choice?.finish_reason === "length") {
        throw new Error(
          "The document was too large for the AI to finish in one response. Try a shorter document or fewer pages.",
        );
      }
      return String(choice?.message?.content ?? "");
    }

    lastErrorBody = await res.text();

    if (res.status === 429) throw new Error("AI rate limit reached. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Upgrade your plan to continue.");

    const retryable = res.status === 503 || res.status === 500 || res.status === 429;
    if (retryable && attempt < maxAttempts) {
      const delayMs = attempt * 1000; // 1s, then 2s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (res.status === 503) {
      throw new Error("Gemini is currently experiencing high demand. Please try again in a moment.");
    }
    throw new Error(`AI gateway error (${res.status}): ${lastErrorBody.slice(0, 200)}`);
  }

  // Unreachable, but keeps TypeScript happy about the return type.
  throw new Error(`AI gateway error: ${lastErrorBody.slice(0, 200)}`);
}
