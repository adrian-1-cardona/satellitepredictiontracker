// Integration test for the Professional_Type_System.
//
// Validates: Requirements 5.1, 5.3, 5.4, 5.5, 5.6, 5.7
//
// Two cases:
//   1. The static `index.html` must preconnect to `fonts.googleapis.com`,
//      load the stylesheet with `display=swap`, and reference both the
//      `Space Grotesk` display face and the `Inter Tight` body face.
//   2. Once `styles.css` is loaded, the `:root` CSS custom properties
//      `--font-display` and `--font-body` must resolve to strings that
//      include their respective primary face and at least one entry from
//      the system-fallback stack.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, test, expect } from "vitest";

// Side-effect import so jsdom + vitest (css: true) applies the stylesheet
// and `getComputedStyle` can resolve the custom properties declared on
// `:root` inside styles.css.
import "../styles.css";

// Resolve `frontend/index.html` from this test file:
//   frontend/src/__tests__/typography.test.js
//   ../                    -> frontend/src/__tests__
//   ../../                 -> frontend/src
//   ../../../              -> frontend
// The fileURLToPath(...) result is the file itself, so the first `..`
// moves up to the containing directory before we start climbing.
const INDEX_HTML_PATH = path.resolve(
  fileURLToPath(import.meta.url),
  "../../../index.html",
);

// System-fallback faces we expect to appear in every font-stack CSS
// variable. Any one of these counts as the fallback stack being present.
const SYSTEM_FALLBACKS = [
  "ui-sans-serif",
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  "Segoe UI",
];

describe("Professional typography system — index.html font loading", () => {
  const html = readFileSync(INDEX_HTML_PATH, "utf8");

  test("uses font-display: swap on the web font stylesheet (Req 5.5)", () => {
    expect(html).toMatch(/display=swap/);
  });

  test("preconnects to fonts.googleapis.com to avoid FOUT >300ms (Req 5.5)", () => {
    expect(html).toMatch(/preconnect/);
    expect(html).toMatch(/fonts\.googleapis\.com/);
  });

  test("loads both Space Grotesk and Inter Tight (Req 5.1, 5.2, 5.6)", () => {
    // Google Fonts URL-encodes spaces as `+`, so accept either form.
    expect(html).toMatch(/Space[+ ]Grotesk/i);
    expect(html).toMatch(/Inter[+ ]Tight/i);
  });
});

describe("Professional typography system — :root CSS variables", () => {
  test("--font-display includes Space Grotesk and a system fallback (Req 5.1, 5.3, 5.4, 5.7)", () => {
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--font-display")
      .trim();

    expect(value).not.toBe("");
    expect(value).toMatch(/"?Space Grotesk"?/);
    const hasFallback = SYSTEM_FALLBACKS.some((face) => value.includes(face));
    expect(hasFallback).toBe(true);
  });

  test("--font-body includes Inter Tight and a system fallback (Req 5.1, 5.4, 5.7)", () => {
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--font-body")
      .trim();

    expect(value).not.toBe("");
    expect(value).toMatch(/"?Inter Tight"?/);
    const hasFallback = SYSTEM_FALLBACKS.some((face) => value.includes(face));
    expect(hasFallback).toBe(true);
  });
});
