import test from "node:test";
import assert from "node:assert/strict";
import { createArticleGeneratorFromEnv } from "./article-generator-provider.mjs";

test("article generator remains disabled unless explicitly enabled", () => {
  assert.equal(createArticleGeneratorFromEnv({}), null);
});

test("enabled OpenAI-compatible provider sends the brief and returns Markdown", async () => {
  let request;
  const generate = createArticleGeneratorFromEnv({
    ARTICLE_GENERATOR_ENABLED: "true",
    ARTICLE_GENERATOR_ENDPOINT: "https://model.example/v1/chat/completions",
    ARTICLE_GENERATOR_MODEL: "test-model",
    ARTICLE_GENERATOR_API_KEY: "server-only-test-key",
  }, {
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return Response.json({ choices: [{ message: { content: "---\ntitle: Test\nstatus: draft\npublicationStatus: draft\n---\n## A section\nArticle content." } }] });
    },
  });
  const result = await generate({ brief: { targetQuery: "test query" } });
  assert.equal(result.provider, "OPENAI_COMPATIBLE");
  assert.match(result.markdown, /publicationStatus: draft/);
  assert.equal(request.options.headers.authorization, "Bearer server-only-test-key");
  assert.equal(JSON.parse(request.options.body).messages[1].content, '{"targetQuery":"test query"}');
});

test("remote non-HTTPS generation endpoints are rejected", () => {
  assert.throws(() => createArticleGeneratorFromEnv({
    ARTICLE_GENERATOR_ENABLED: "true",
    ARTICLE_GENERATOR_ENDPOINT: "http://model.example/v1/chat/completions",
    ARTICLE_GENERATOR_MODEL: "test-model",
  }), /HTTPS/);
});
