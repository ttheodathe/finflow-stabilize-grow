/**
 * Minimal, dependency-free YAML-frontmatter parser, purpose-built for this app's
 * blog post schema (see ./validation.ts): flat string/boolean fields plus one
 * string-array field (`tags`). It is NOT a general YAML parser.
 *
 * Why this exists instead of using the `gray-matter` package: gray-matter calls
 * Node's `Buffer.from()` internally on every parse, even for plain-string input
 * (see its lib/utils.js `toBuffer` helper). `Buffer` is a Node global that does
 * not exist in the browser. Because this parsing code is imported into
 * src/routes/blog.tsx's component (for client-side search/filtering) and every
 * route in this app is bundled eagerly rather than lazily, that Node-only
 * assumption shipped into the single shared client chunk loaded on EVERY page
 * — crashing sign-in, sign-up, and testimonials, not just /blog, with
 * "Uncaught ReferenceError: Buffer is not defined". A `globalThis.Buffer` stub
 * was tried first but proved fragile to rely on across bundler/build changes.
 * Removing the Node-oriented dependency entirely, for this narrow well-defined
 * use case, removes the failure mode altogether rather than continuing to
 * patch around it.
 *
 * Supported frontmatter value forms (exactly what content/blog/*.md uses):
 *   key: "quoted string"
 *   key: unquoted string
 *   key: true / false
 *   key:
 *     - item one
 *     - item two
 */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const normalized = raw.replace(/^\uFEFF/, ""); // strip BOM, same as gray-matter did

  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(normalized);
  if (!match) {
    // No frontmatter block found — treat the whole file as content with no data,
    // matching gray-matter's behavior for input with no `---` delimiters.
    return { data: {}, content: normalized };
  }

  const [, block, content] = match;
  const data: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);

  let currentArrayKey: string | null = null;

  for (const line of lines) {
    if (line.trim() === "") continue;

    const arrayItemMatch = /^\s+-\s+(.*)$/.exec(line);
    if (arrayItemMatch && currentArrayKey) {
      (data[currentArrayKey] as unknown[]).push(parseScalar(arrayItemMatch[1]));
      continue;
    }

    const kvMatch = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kvMatch) continue; // ignore anything we don't recognize rather than throwing

    const [, key, rawValue] = kvMatch;
    if (rawValue.trim() === "") {
      // Empty value on this line means an array follows on subsequent lines.
      data[key] = [];
      currentArrayKey = key;
    } else {
      data[key] = parseScalar(rawValue);
      currentArrayKey = null;
    }
  }

  return { data, content };
}

function parseScalar(value: string): string | boolean {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const quoted = /^"(.*)"$/.exec(trimmed) ?? /^'(.*)'$/.exec(trimmed);
  return quoted ? quoted[1] : trimmed;
}
