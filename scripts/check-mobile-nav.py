#!/usr/bin/env python3
"""Viewport-based UI checks for the mobile navigation.

Verifies at 320 / 375 / 390 / 414 / 768 px that:
  1. The desktop sidebar is hidden below 1024 px.
  2. The fixed mobile header is pinned to the top (top ~= 0, height ~= 56).
  3. <main> content starts BELOW the mobile header (no overlap).
  4. Tapping the hamburger opens the slide-out drawer.
  5. Clicking a nav link inside the drawer closes it.
  6. No horizontal overflow on public routes.

Usage:
    # Dev server must be running (default http://localhost:8080).
    # For authed checks, pass credentials via env:
    TEST_EMAIL=you@example.com TEST_PASSWORD=... python3 scripts/check-mobile-nav.py

Screenshots + JSON report are written to /tmp/mobile-nav-checks/.
Exit code is non-zero if any assertion fails.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080")
WIDTHS = [320, 375, 390, 414, 768]
OUT = Path("/tmp/mobile-nav-checks")
OUT.mkdir(parents=True, exist_ok=True)

MOBILE_HEADER_H = 56  # h-14
FAILURES: list[str] = []


def ok(msg: str) -> None:
    print(f"  \u2713 {msg}")


def fail(msg: str) -> None:
    print(f"  \u2717 {msg}")
    FAILURES.append(msg)


async def try_sign_in(page) -> bool:
    email = os.environ.get("TEST_EMAIL")
    password = os.environ.get("TEST_PASSWORD")
    if not email or not password:
        return False
    await page.goto(f"{BASE}/auth?mode=login", wait_until="domcontentloaded")
    await page.get_by_label("Email", exact=False).fill(email)
    await page.get_by_label("Password", exact=False).first.fill(password)
    await page.get_by_role("button", name="Sign in").first.click()
    try:
        await page.wait_for_url("**/dashboard**", timeout=15_000)
        return True
    except Exception:
        return "/dashboard" in page.url


async def check_public_landing(page, width: int) -> None:
    print(f"\n[public @ {width}px]")
    await page.set_viewport_size({"width": width, "height": 900})
    await page.goto(f"{BASE}/", wait_until="domcontentloaded")
    await page.wait_for_timeout(400)
    await page.screenshot(path=str(OUT / f"{width}_landing.png"))
    overflow = await page.evaluate(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    if overflow <= 1:
        ok("no horizontal overflow")
    else:
        fail(f"[{width}] landing horizontal overflow: {overflow}px")


async def check_authed_shell(page, width: int) -> None:
    print(f"\n[authed @ {width}px]")
    await page.set_viewport_size({"width": width, "height": 900})
    await page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
    await page.wait_for_timeout(700)
    await page.screenshot(path=str(OUT / f"{width}_dashboard.png"))

    geom = await page.evaluate(
        """() => {
            const main = document.querySelector('main');
            const headers = Array.from(document.querySelectorAll('header')).map(el => {
                const r = el.getBoundingClientRect();
                const s = getComputedStyle(el);
                return { top: r.top, height: r.height, display: s.display };
            });
            const sidebars = Array.from(document.querySelectorAll('[data-sidebar=\"sidebar\"]')).map(el => {
                const r = el.getBoundingClientRect();
                const s = getComputedStyle(el);
                return { width: r.width, display: s.display, mobile: el.getAttribute('data-mobile') };
            });
            return {
                main: main ? { top: main.getBoundingClientRect().top } : null,
                headers, sidebars,
            };
        }"""
    )

    mobile_header = next(
        (
            h for h in geom["headers"]
            if h["display"] != "none"
            and abs(h["top"]) < 1
            and abs(h["height"] - MOBILE_HEADER_H) < 2
        ),
        None,
    )
    if mobile_header:
        ok(f"mobile header pinned (h={mobile_header['height']})")
    else:
        fail(f"[{width}] mobile header missing/misplaced: {geom['headers']}")

    desktop_visible = any(
        s["mobile"] != "true" and s["display"] != "none" and s["width"] > 0
        for s in geom["sidebars"]
    )
    if desktop_visible:
        fail(f"[{width}] desktop sidebar visible below 1024px")
    else:
        ok("desktop sidebar hidden")

    main_top = (geom["main"] or {}).get("top")
    if main_top is not None and main_top >= MOBILE_HEADER_H - 1:
        ok(f"main content clears header (main.top={main_top})")
    else:
        fail(f"[{width}] main overlaps mobile header (main.top={main_top})")

    # Open drawer via hamburger
    try:
        await page.locator('[data-sidebar="trigger"]').first.click(timeout=3000)
        await page.wait_for_timeout(450)
        await page.screenshot(path=str(OUT / f"{width}_drawer.png"))
        drawer = await page.evaluate(
            """() => {
                const el = document.querySelector('[data-sidebar=\"sidebar\"][data-mobile=\"true\"]');
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { width: r.width, left: r.left };
            }"""
        )
        if drawer and drawer["width"] > 200 and drawer["left"] <= 0:
            ok(f"drawer opened (w={drawer['width']})")
        else:
            fail(f"[{width}] drawer failed to open: {drawer}")
    except Exception as e:
        fail(f"[{width}] drawer trigger error: {e}")
        return

    # Nav link inside drawer should close it
    try:
        await page.get_by_role("link", name="Companies", exact=True).first.click(timeout=3000)
        await page.wait_for_timeout(400)
        still_open = await page.evaluate(
            "!!document.querySelector('[data-sidebar=\"sidebar\"][data-mobile=\"true\"]')"
        )
        if still_open:
            fail(f"[{width}] drawer did not close after nav")
        else:
            ok("drawer closes after nav")
    except Exception as e:
        fail(f"[{width}] nav-close check errored: {e}")


async def main() -> None:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        authed = False
        try:
            authed = await try_sign_in(page)
        except Exception as e:
            print(f"sign-in failed: {e}")

        for w in WIDTHS:
            await check_public_landing(page, w)
            if authed:
                await check_authed_shell(page, w)
            else:
                print(f"[authed @ {w}px] skipped \u2014 set TEST_EMAIL/TEST_PASSWORD to enable")

        await browser.close()

    (OUT / "report.json").write_text(json.dumps({"failures": FAILURES}, indent=2))
    print(f"\nScreenshots: {OUT}")
    if FAILURES:
        print(f"FAILED ({len(FAILURES)} issue(s))")
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    asyncio.run(main())