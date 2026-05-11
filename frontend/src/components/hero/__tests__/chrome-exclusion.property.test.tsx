// Feature: globe-hero-ui, Property 3
//
// Validates: Requirements 2.5, 2.6, 2.7, 3.3
//
// Property 3: All chrome lies outside the viewport center third.
//
//   For any viewport (w, h) in the supported desktop/tablet range and for
//   any chrome element `e` in `{ TopRightAuthBar, StatusIndicator }`, the
//   bounding rectangle of `e` must satisfy:
//
//     (e.right <= w/3 || e.left  >= 2*w/3)   // horizontal exclusion
//     AND
//     (e.bottom <= h/3 || e.top  >= 2*h/3)   // vertical   exclusion
//
// Scope note:
//   Req 2.1 scopes the strict center-third exclusion rule to viewport
//   widths at or above 768px (the Auth_Entry_Control's 24px inset guarantee
//   starts there). At narrower widths the CSS `max-width: calc((100vw -
//   48px) / 3)` cap is the primary defense, but the TopRightAuthBar uses a
//   stacked column layout (see `@media (max-width: 479px)`) whose exact
//   pixel extents are covered by example-based unit tests rather than this
//   property. We therefore generate w in [768, 2560] and h in [600, 1600],
//   matching the "supported viewport size" language in Req 2.1.
//
// Implementation notes:
//   - `<Landing/>` mounts `<HeroStage/>` → `<EarthGlobe/>` which needs a
//     WebGL context; we mock `useThreeScene`, `GLTFLoader`, and
//     `THREE.TextureLoader.prototype.load` to skip Three.js work entirely.
//     Chrome layout does not depend on the canvas content.
//   - `api.head` (used by `<StatusIndicator/>`) is stubbed so no real HTTP
//     traffic runs during the 100-iteration property loop.
//   - The chrome rectangles are read via `getBoundingClientRect()`, which
//     in jsdom returns zeros by default. `vitest.setup.js` installs a
//     polyfill that synthesises a rect from the element's computed
//     `position`/`top`/`right`/`bottom`/`left`/`width`/`height`. With the
//     TopRightAuthBar CSS (`position: fixed; top: 24px; right: 24px;`) and
//     the StatusIndicator CSS (`position: fixed; bottom: 24px; left: 24px;`)
//     plus no explicit px width on either, the polyfill falls back to
//     200px × 44px — small enough at w >= 768 that the right edge of the
//     top-right pill sits in the right outer third and the left edge of the
//     status pill sits in the left outer third.

import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fc from "fast-check";
import * as THREE from "three";

// --- Mocks (hoisted by Vitest) ------------------------------------------------

// Stub the health probe so the StatusIndicator effect does not issue real
// HTTP requests during the 100 property iterations.
vi.mock("../../../api/client.js", async () => {
  const actual = await vi.importActual("../../../api/client.js");
  return {
    ...actual,
    api: { ...actual.api, head: vi.fn().mockResolvedValue({ status: 200 }) },
  };
});

// Bypass the real Three.js scene entirely. EarthGlobe only uses the ref as
// a DOM mount point, and chrome layout does not depend on the canvas.
vi.mock("../../../hooks/useThreeScene.js", () => ({
  useThreeScene: () => ({ current: document.createElement("div") }),
  useReducedMotion: () => false,
}));

// No-op GLTFLoader — safety net in case the hook mock is ever bypassed.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class NoopGLTFLoader {
    load() {}
  },
}));

// Stub texture loads so jsdom never attempts image fetches.
THREE.TextureLoader.prototype.load = function mockedTextureLoad() {
  return new THREE.Texture();
};

// Imports below must come AFTER the mocks so their module graph resolves
// against the stubs.
import { AuthProvider } from "../../../auth/AuthContext.jsx";
import Landing from "../../../pages/Landing.jsx";

afterEach(() => {
  cleanup();
});

function setViewport(w, h) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: w,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: h,
  });
  window.dispatchEvent(new Event("resize"));
}

/**
 * Assert that a chrome element's bounding rect lies entirely outside the
 * viewport's center third on both axes. The predicate matches the one
 * stated in Property 3.
 */
function assertOutsideCenterThird(rect, w, h, label) {
  const horizontalOK = rect.right <= w / 3 || rect.left >= (2 * w) / 3;
  const verticalOK = rect.bottom <= h / 3 || rect.top >= (2 * h) / 3;
  expect(
    horizontalOK,
    `${label} violates horizontal center-third exclusion at ${w}x${h}: ` +
      `left=${rect.left}, right=${rect.right}, w/3=${w / 3}, 2w/3=${(2 * w) / 3}`,
  ).toBe(true);
  expect(
    verticalOK,
    `${label} violates vertical center-third exclusion at ${w}x${h}: ` +
      `top=${rect.top}, bottom=${rect.bottom}, h/3=${h / 3}, 2h/3=${(2 * h) / 3}`,
  ).toBe(true);
}

/**
 * Validates: Requirements 2.5, 2.6, 2.7, 3.3 (Property 3)
 *
 * For every viewport (w, h) in the supported range, both the top-right
 * auth bar and the bottom-left status indicator render with bounding rects
 * that fall entirely outside the viewport's center third on both axes.
 */
test("chrome stays outside the viewport center third for any supported (w, h)", () => {
  fc.assert(
    fc.property(
      fc.record({
        w: fc.integer({ min: 768, max: 2560 }),
        h: fc.integer({ min: 600, max: 1600 }),
      }),
      ({ w, h }) => {
        setViewport(w, h);

        const { unmount } = render(
          <MemoryRouter>
            <AuthProvider>
              <Landing />
            </AuthProvider>
          </MemoryRouter>,
        );

        try {
          const topRight = document.querySelector(".top-right-auth");
          const status = document.querySelector(".status-indicator");

          expect(topRight, "TopRightAuthBar must be mounted").not.toBeNull();
          expect(status, "StatusIndicator must be mounted").not.toBeNull();

          assertOutsideCenterThird(
            topRight.getBoundingClientRect(),
            w,
            h,
            ".top-right-auth",
          );
          assertOutsideCenterThird(
            status.getBoundingClientRect(),
            w,
            h,
            ".status-indicator",
          );
        } finally {
          unmount();
        }
      },
    ),
    { numRuns: 100 },
  );
});
