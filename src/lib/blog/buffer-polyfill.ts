// gray-matter (a Node-oriented frontmatter parser used by ./posts.ts) calls
// Buffer.isBuffer() / Buffer.from() internally on every call to matter(),
// even when it's given a plain string — which is all posts.ts ever passes it
// (content always comes from import.meta.glob's `?raw` string import, never
// a real Node Buffer). Node's `Buffer` global doesn't exist in the browser,
// and because posts.ts is imported into blog.tsx's component (for
// client-side search/filtering) and every route in routeTree.gen.ts is
// imported eagerly rather than lazily, this module ships into the single
// shared client chunk that loads on EVERY page — so the missing global
// crashed sign-in, sign-up, and testimonials too, not just /blog.
//
// This is a deliberately minimal stub, not a full Buffer implementation —
// it only covers what gray-matter needs for our string-only usage. If any
// future code needs real Buffer semantics in the browser, use the `buffer`
// npm polyfill package instead of expanding this.
//
// Must be the FIRST import wherever it's used — sibling ES module imports
// execute in declaration order, so this needs to run before gray-matter's
// `matter()` is ever called.
if (typeof globalThis.Buffer === "undefined") {
  class BufferPolyfill {
    static isBuffer(_value: unknown): boolean {
      return false;
    }
    static from(value: string) {
      return { toString: () => value };
    }
  }
  // @ts-expect-error — intentionally minimal browser-only stub, not a real Buffer
  globalThis.Buffer = BufferPolyfill;
}
