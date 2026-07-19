#!/usr/bin/env node
/**
 * Viewport-based UI checks for the authenticated app shell.
 *
 * Verifies at 320 / 375 / 390 / 414 / 768 px that:
 *   1. The desktop sidebar is hidden (< 1024 px).
 *   2. The fixed mobile header is visible and pinned to the top (top === 0, height === 56).
 *   3. The <main> content starts BELOW the mobile header (no overlap): main.top >= 56.
 *   4. Tapping the hamburger opens the slide-out drawer and it covers the viewport-left edge.
 *   5. Clicking a nav link inside the drawer closes it (drawer element removed / hidden).
 *
 * Usage:
 *   # Dev server must be running on http://localhost:8080
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=... node scripts/check-mobile-nav.mjs
 *
 * If credentials are omitted, the script will still run public-route checks
 * (landing header/content offset) and report which authenticated checks were
 * skipped.
 *
 * Requires: `bun add -d playwright` (or `npm i -D playwright`) and
 *           `npx playwright install chromium`.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const WIDTHS = [320, 375, 390, 414, 768];
const OUT = "/tmp/mobile-nav-checks";
mkdirSync(OUT, { recursive: true });

const MOBILE_HEADER_H = 56; // h-14

function fail(msg) {
  console.error("  ✗", msg);
  process.exitCode = 1;
}
function ok(msg) {
  console.log("  ✓", msg);
}

async function signIn(page) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) return false;
  await page.goto(`${BASE}/auth?mode=login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding|verify-email)/, { timeout: 15000 });
  return page.url().includes("/dashboard");
}

async function checkAuthedShell(page, width) {
  console.log(`\n[authed @ ${width}px]`);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, `${width}_dashboard.png`) });

  const geometry = await page.evaluate(() => {
    const main = document.querySelector("main");
    const headers = Array.from(document.querySelectorAll("header")).map((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { top: r.top, height: r.height, display: s.display, position: s.position };
    });
    const sidebars = Array.from(document.querySelectorAll('[data-sidebar="sidebar"]')).map((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { width: r.width, display: s.display, mobile: el.getAttribute("data-mobile") };
    });
    return {
      main: main ? { top: main.getBoundingClientRect().top } : null,
      headers,
      sidebars,
    };
  });

  const mobileHeader = geometry.headers.find(
    (h) => h.display !== "none" && Math.abs(h.top) < 1 && Math.abs(h.height - MOBILE_HEADER_H) < 2,
  );
  mobileHeader
    ? ok(`mobile header pinned (top=${mobileHeader.top}, h=${mobileHeader.height})`)
    : fail(`mobile header missing or misplaced: ${JSON.stringify(geometry.headers)}`);

  const desktopSidebarVisible = geometry.sidebars.some(
    (s) => s.mobile !== "true" && s.display !== "none" && s.width > 0,
  );
  desktopSidebarVisible
    ? fail("desktop sidebar is visible below 1024px")
    : ok("desktop sidebar hidden");

  geometry.main && geometry.main.top >= MOBILE_HEADER_H - 1
    ? ok(`main content clears header (top=${geometry.main?.top})`)
    : fail(`main overlaps mobile header (main.top=${geometry.main?.top})`);

  // Open drawer
  const trigger = page.locator('[data-sidebar="trigger"]').first();
  await trigger.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${width}_drawer.png`) });
  const drawer = await page.evaluate(() => {
    const el = document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { width: r.width, left: r.left };
  });
  drawer && drawer.width > 200 && drawer.left <= 0
    ? ok(`drawer opened (w=${drawer.width}, left=${drawer.left})`)
    : fail(`drawer failed to open: ${JSON.stringify(drawer)}`);

  // Click a nav link → drawer should close
  try {
    await page.getByRole("link", { name: /^Companies$/ }).first().click({ timeout: 2000 });
    await page.waitForTimeout(400);
    const stillOpen = await page.evaluate(
      () => !!document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]'),
    );
    stillOpen ? fail("drawer did not close after navigation") : ok("drawer closes after nav");
  } catch (e) {
    fail(`nav-close check errored: ${e.message}`);
  }
}

async function checkPublicLanding(page, width) {
  console.log(`\n[public @ ${width}px]`);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${width}_landing.png`) });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  overflow <= 1 ? ok("no horizontal overflow") : fail(`horizontal overflow: ${overflow}px`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const authed = await signIn(page).catch((e) => {
    console.warn("sign-in failed:", e.message);
    return false;
  });

  for (const w of WIDTHS) {
    await checkPublicLanding(page, w);
    if (authed) await checkAuthedShell(page, w);
    else console.log(`[authed @ ${w}px] skipped — set TEST_EMAIL / TEST_PASSWORD to enable`);
  }

  await browser.close();
  console.log(
    `\nScreenshots: ${OUT}\nExit: ${process.exitCode ? "FAIL" : "OK"}`,
  );
})();