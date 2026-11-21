const DEFAULT_TIMEOUT_MS = 120_000;

function required(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(name + " is required.");
  return value.trim();
}

export function createArticleGeneratorFromEnv(env = process.env, { fetchImpl = fetch } = {}) {
  if (env.ARTICLE_GENERATOR_ENABLED !== "true") return null;
  const endpoint = required(env.ARTICLE_GENERATOR_ENDPOINT, "ARTICLE_GENERATOR_ENDPOINT");
  const model = required(env.ARTICLE_GENERATOR_MODEL, "ARTICLE_GENERATOR_MODEL");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Article generator endpoint must use HTTPS outside localhost.");
  }
  const apiKey = env.ARTICLE_GENERATOR_API_KEY || null;
  const timeoutMs = Number(env.ARTICLE_GENERATOR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300_000) {
    throw new Error("ARTICLE_GENERATOR_TIMEOUT_MS must be between 1000 and 300000.");
  }

  return async function generateArticle({ brief }) {
    const controller = new AbortController();
    const timeout = setTimeout(function abortRequest() { controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(apiKey ? { authorization: "Bearer " + apiKey } : {}),
        },
        body: JSON.stringify({
          model: model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: [
                "You are an evidence-led editorial writer for FinFlow Track.",
                "Write original, useful, comprehensive Markdown for the specified audience and search intent.",
                "Use only the evidence supplied in the brief for factual claims; never invent figures, features, laws, quotations, customer stories or sources.",
                "Cite every supplied evidence source at least once using a Markdown link to its exact supplied URL or finalUrl; do not add external source links that are not in the evidence list.",
                "Preserve the exact title, description and slug supplied in the brief frontmatter.",
                "Respect jurisdiction and source limitations. Mark genuine uncertainty clearly.",
                "Do not provide tax or legal advice. Do not invent FinFlow Track capabilities.",
                "Use US spelling. Include practical examples only when clearly labelled Example.",
                "Return Markdown only. Frontmatter must preserve the exact title, description, slug, category and tags from publicationMetadata; include status: draft, publicationStatus: draft and draft: true.",
                "Preserve author and publishedAt only when they are explicitly supplied in publicationMetadata; otherwise leave them unassigned for the human approval/publication stage.",
                "Do not claim the article is published or approved.",
              ].join(" "),
            },
            { role: "user", content: JSON.stringify(brief) },
          ],
        }),
      });
      if (!response.ok) throw new Error("Article generator returned HTTP " + response.status + ".");
      const payload = await response.json();
      const markdown = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      if (typeof markdown !== "string" || !markdown.trim()) {
        throw new Error("Article generator response did not contain choices[0].message.content.");
      }
      return { markdown: markdown, provider: "OPENAI_COMPATIBLE", model: model };
    } finally {
      clearTimeout(timeout);
    }
  };
}

export { DEFAULT_TIMEOUT_MS };
