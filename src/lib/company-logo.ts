/**
 * src/lib/company-logo.ts
 *
 * Single source of truth for turning a "company logo reference" (a public URL
 * OR a Supabase Storage path) into a ready-to-render, size-capped PNG/JPEG
 * data URL.
 *
 * This module is the ONLY place in the codebase allowed to:
 *   - fetch() an image
 *   - talk to Supabase Storage
 *   - touch FileReader / Image() / <canvas>
 *
 * Every document generator (invoices, quotes, purchase orders, receipts,
 * delivery notes, ...) must call `getCompanyLogo()` and pass the resulting
 * `CompanyLogo | null` into its own pure renderer. Renderers never fetch.
 *
 * Design goals (SOLID):
 *   - SRP: each function does exactly one job (fetch, detect, validate,
 *     convert, resize, cache, dimension-read). getCompanyLogo() is the only
 *     orchestrator.
 *   - OCP: new formats/buckets are added by extending the format table and
 *     resolver, not by editing call sites.
 *   - DIP: callers depend on the `CompanyLogo` shape and `getCompanyLogo()`
 *     contract, never on Supabase or DOM APIs directly.
 *
 * No silent failures: every catch block logs a structured entry describing
 * the stage, the input, and the underlying error before the function
 * degrades gracefully (returns null) or rethrows.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SupportedFormat = "PNG" | "JPEG";

export type CompanyLogo = {
  dataUrl: string;
  width: number;
  height: number;
  format: SupportedFormat;
};

export type GetCompanyLogoOptions = {
  /** Supabase Storage bucket to use when `logoRef` is a storage path rather than a full URL. Default: "company-assets". */
  bucket?: string;
  /** Signed URL lifetime in seconds. Default: 3600 (1 hour). */
  signedUrlExpiresIn?: number;
  /** Network timeout in ms for the image fetch. Default: 8000. */
  timeoutMs?: number;
  /** Maximum rendered width, in the same unit the PDF layer uses (mm). Default: 110. */
  maxWidth?: number;
  /** Maximum rendered height, in the same unit the PDF layer uses (mm). Default: 60. */
  maxHeight?: number;
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type DetectedFormat =
  | "PNG"
  | "JPEG"
  | "GIF"
  | "BMP"
  | "TIFF"
  | "WEBP"
  | "SVG"
  | "UNKNOWN";

type LogPayload = Record<string, unknown>;

const DEFAULT_BUCKET = "company-assets";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_WIDTH_MM = 110;
const DEFAULT_MAX_HEIGHT_MM = 60;

// Rendering to canvas happens at a higher DPI than the final mm box so the
// embedded PDF image stays crisp without shipping a needlessly large asset.
const RASTER_DPI_SCALE = 4; // px per mm, roughly ~96-150dpi equivalent for a 110x60mm box

const REJECTED_FORMATS: ReadonlySet<DetectedFormat> = new Set([
  "SVG",
  "GIF",
  "BMP",
  "TIFF",
  "UNKNOWN",
]);

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

/**
 * Every failure path funnels through here. Never swallow an error without
 * calling this first — that is the "no silent failures" contract.
 */
function logPipelineError(stage: string, payload: LogPayload, error: unknown): void {
  const normalizedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error) };

  // eslint-disable-next-line no-console
  console.error({
    scope: "company-logo",
    stage,
    ...payload,
    error: normalizedError,
    timestamp: new Date().toISOString(),
  });
}

function logPipelineInfo(stage: string, payload: LogPayload): void {
  // eslint-disable-next-line no-console
  console.info({ scope: "company-logo", stage, ...payload, timestamp: new Date().toISOString() });
}

/**
 * Distinguishes pipeline failures (fetch/validation/conversion) from generic
 * errors so getCompanyLogo() can log once at the source and once at the
 * boundary without duplicating unrelated stack traces.
 */
export class ImagePipelineError extends Error {
  readonly stage: string;
  readonly cause?: unknown;

  constructor(stage: string, message: string, cause?: unknown) {
    super(message);
    this.name = "ImagePipelineError";
    this.stage = stage;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Signed URL cache
// ---------------------------------------------------------------------------

type CachedSignedUrl = {
  url: string;
  expiresAtMs: number;
};

/** path -> cached signed URL + expiry. Module-level so it survives across calls in the same session. */
const signedUrlCache = new Map<string, CachedSignedUrl>();

/**
 * Returns a cached signed URL if it is still valid, otherwise requests a new
 * one from Supabase Storage, caches it, and returns it. Guarantees we never
 * request a signed URL twice within its lifetime for the same path+bucket.
 */
export async function cacheSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  const cacheKey = `${bucket}::${path}`;
  const now = Date.now();
  const cached = signedUrlCache.get(cacheKey);

  // 30s safety margin so we never hand out a URL that expires mid-request.
  if (cached && cached.expiresAtMs - 30_000 > now) {
    logPipelineInfo("signed-url-cache-hit", { bucket, path });
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    logPipelineError("signed-url-create", { bucket, path }, error ?? new Error("No signedUrl returned"));
    throw new ImagePipelineError("signed-url-create", `Failed to create signed URL for ${bucket}/${path}`, error);
  }

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAtMs: now + expiresInSeconds * 1000,
  });

  logPipelineInfo("signed-url-cache-miss", { bucket, path, expiresInSeconds });
  return data.signedUrl;
}

/** Clears the signed URL cache. Exposed for tests and manual cache-busting. */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

// ---------------------------------------------------------------------------
// Fetch (with timeout)
// ---------------------------------------------------------------------------

/**
 * Fetches raw image bytes with AbortController-based timeout protection.
 * Never throws a raw fetch error — always wraps it in ImagePipelineError
 * with the "fetch" stage after logging.
 */
export async function fetchImage(url: string, timeoutMs: number): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    const stage = isTimeout ? "timeout" : "fetch";
    logPipelineError(stage, { url, timeoutMs }, error);
    throw new ImagePipelineError(stage, isTimeout ? `Image fetch timed out after ${timeoutMs}ms: ${url}` : `Image fetch failed: ${url}`, error);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Format detection (magic-byte sniffing — never trust file extensions)
// ---------------------------------------------------------------------------

export function detectImageFormat(buffer: ArrayBuffer): DetectedFormat {
  const bytes = new Uint8Array(buffer.slice(0, 16));

  const matches = (offset: number, sequence: number[]): boolean =>
    sequence.every((byte, i) => bytes[offset + i] === byte);

  if (matches(0, [0x89, 0x50, 0x4e, 0x47])) return "PNG";
  if (matches(0, [0xff, 0xd8, 0xff])) return "JPEG";
  if (matches(0, [0x47, 0x49, 0x46, 0x38])) return "GIF";
  if (matches(0, [0x42, 0x4d])) return "BMP";
  if (matches(0, [0x49, 0x49, 0x2a, 0x00]) || matches(0, [0x4d, 0x4d, 0x00, 0x2a])) return "TIFF";
  if (matches(0, [0x52, 0x49, 0x46, 0x46]) && matches(8, [0x57, 0x45, 0x42, 0x50])) return "WEBP";

  // SVG is text, not binary magic bytes — sniff the decoded head.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim().toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return "SVG";

  return "UNKNOWN";
}

/**
 * Enforces the supported-format allowlist. Throws ImagePipelineError (never
 * returns a boolean the caller might ignore) so rejection can never be
 * silently skipped.
 */
export function validateMime(format: DetectedFormat, sourceLabel: string): asserts format is DetectedFormat {
  if (REJECTED_FORMATS.has(format)) {
    const error = new ImagePipelineError(
      "validation",
      `Rejected image format "${format}" for ${sourceLabel}. Supported: PNG, JPEG, JPG, WEBP (auto-converted).`,
    );
    logPipelineError("validation", { format, sourceLabel }, error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Binary -> data URL
// ---------------------------------------------------------------------------

const MIME_BY_FORMAT: Record<"PNG" | "JPEG" | "WEBP", string> = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
};

export function imageToDataUrl(buffer: ArrayBuffer, format: "PNG" | "JPEG" | "WEBP"): string {
  try {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return `data:${MIME_BY_FORMAT[format]};base64,${base64}`;
  } catch (error) {
    logPipelineError("conversion", { format }, error);
    throw new ImagePipelineError("conversion", "Failed to base64-encode image bytes", error);
  }
}

// ---------------------------------------------------------------------------
// Dimension reading (with timeout protection)
// ---------------------------------------------------------------------------

export function loadImageDimensions(dataUrl: string, timeoutMs: number): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      const error = new ImagePipelineError("timeout", `Image dimension read timed out after ${timeoutMs}ms`);
      logPipelineError("timeout", { stage: "loadImageDimensions" }, error);
      reject(error);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (event) => {
      clearTimeout(timer);
      const error = new ImagePipelineError("conversion", "Browser could not decode image for dimension read", event);
      logPipelineError("conversion", { stage: "loadImageDimensions" }, error);
      reject(error);
    };
    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// Resize / re-encode via canvas
// ---------------------------------------------------------------------------

type ResizedImage = {
  dataUrl: string;
  width: number;
  height: number;
  format: SupportedFormat;
};

/**
 * Draws the source image onto a canvas scaled to fit within
 * (maxWidthMm x maxHeightMm) while preserving aspect ratio, then re-encodes
 * it. WEBP sources are always normalized to PNG here (canvas re-encoding is
 * how the WEBP -> PNG conversion actually happens). PNG/JPEG sources are
 * re-encoded too, which is what keeps the final PDF small — oversized source
 * logos (e.g. a 4000x4000 export) get downsampled to the box the invoice
 * actually needs.
 */
export async function resizeImage(
  dataUrl: string,
  naturalWidth: number,
  naturalHeight: number,
  maxWidthMm: number,
  maxHeightMm: number,
  outputFormat: SupportedFormat,
  timeoutMs: number,
): Promise<ResizedImage> {
  const targetMaxWidthPx = maxWidthMm * RASTER_DPI_SCALE;
  const targetMaxHeightPx = maxHeightMm * RASTER_DPI_SCALE;

  const scale = Math.min(targetMaxWidthPx / naturalWidth, targetMaxHeightPx / naturalHeight, 1);
  const outWidth = Math.max(1, Math.round(naturalWidth * scale));
  const outHeight = Math.max(1, Math.round(naturalHeight * scale));

  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      const error = new ImagePipelineError("conversion", `Image resize timed out after ${timeoutMs}ms`);
      logPipelineError("timeout", { stage: "resizeImage" }, error);
      reject(error);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Canvas 2D context unavailable");
        }

        // Flatten transparency onto white for JPEG output; PNG keeps alpha.
        if (outputFormat === "JPEG") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, outWidth, outHeight);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, outWidth, outHeight);

        const mime = outputFormat === "PNG" ? "image/png" : "image/jpeg";
        const quality = outputFormat === "JPEG" ? 0.85 : undefined;
        const outDataUrl = canvas.toDataURL(mime, quality);

        resolve({ dataUrl: outDataUrl, width: outWidth, height: outHeight, format: outputFormat });
      } catch (error) {
        logPipelineError("conversion", { stage: "resizeImage" }, error);
        reject(new ImagePipelineError("conversion", "Failed to resize/re-encode image via canvas", error));
      }
    };

    img.onerror = (event) => {
      clearTimeout(timer);
      const error = new ImagePipelineError("conversion", "Browser could not decode image for resize", event);
      logPipelineError("conversion", { stage: "resizeImage" }, error);
      reject(error);
    };

    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// URL resolution: public URL vs. private storage path
// ---------------------------------------------------------------------------

function isFullUrl(ref: string): boolean {
  return /^https?:\/\//i.test(ref);
}

async function resolveLogoUrl(
  logoRef: string,
  bucket: string,
  signedUrlExpiresIn: number,
): Promise<string> {
  if (isFullUrl(logoRef)) {
    // Public bucket or externally-hosted logo — used as-is.
    return logoRef;
  }

  // Treat as a private Supabase Storage path: "<bucket-relative-path>".
  return cacheSignedUrl(bucket, logoRef, signedUrlExpiresIn);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Resolves a company logo reference (public URL or private storage path)
 * into a ready-to-embed `CompanyLogo`, or `null` if there is no logo / the
 * logo could not be safely processed.
 *
 * This function NEVER throws for expected "no logo" or "bad logo" states —
 * every failure is logged with full stage/context detail and degrades to
 * `null` so callers can fall back to a text-only header. It DOES fully log
 * before doing so, satisfying the "no silent failures" requirement: a
 * missing/broken logo is visible in the console even though the invoice
 * still renders.
 */
export async function getCompanyLogo(
  logoRef: string | null | undefined,
  options: GetCompanyLogoOptions = {},
): Promise<CompanyLogo | null> {
  const bucket = options.bucket ?? DEFAULT_BUCKET;
  const signedUrlExpiresIn = options.signedUrlExpiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH_MM;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT_MM;

  if (!logoRef) {
    logPipelineInfo("no-logo-configured", {});
    return null;
  }

  try {
    const url = await resolveLogoUrl(logoRef, bucket, signedUrlExpiresIn);
    const buffer = await fetchImage(url, timeoutMs);
    const detected = detectImageFormat(buffer);

    validateMime(detected, logoRef);

    // At this point format is PNG, JPEG, or WEBP (everything else threw above).
    const sourceFormat = detected as "PNG" | "JPEG" | "WEBP";
    const rawDataUrl = imageToDataUrl(buffer, sourceFormat);
    const { width: naturalWidth, height: naturalHeight } = await loadImageDimensions(rawDataUrl, timeoutMs);

    // WEBP always gets normalized to PNG (lossless, preserves transparency).
    // PNG/JPEG are re-encoded at the target box size to keep the PDF small.
    const outputFormat: SupportedFormat = sourceFormat === "JPEG" ? "JPEG" : "PNG";

    const resized = await resizeImage(
      rawDataUrl,
      naturalWidth,
      naturalHeight,
      maxWidth,
      maxHeight,
      outputFormat,
      timeoutMs,
    );

    logPipelineInfo("logo-ready", {
      logoRef,
      sourceFormat,
      outputFormat: resized.format,
      width: resized.width,
      height: resized.height,
    });

    return {
      dataUrl: resized.dataUrl,
      width: resized.width,
      height: resized.height,
      format: resized.format,
    };
  } catch (error) {
    // Every underlying stage already logged specifics. This final log ties
    // the failure back to the logo reference that triggered it, so a
    // support engineer can grep the console for "logo-pipeline-failed" and
    // immediately see which company/asset broke.
    logPipelineError("logo-pipeline-failed", { logoRef, bucket }, error);
    return null;
  }
}
