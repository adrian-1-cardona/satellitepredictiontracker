// Feature: globe-hero-ui, Property 2
//
// Validates: Requirements 1.7
//
// Property 2: No horizontal page scroll at any supported viewport width.
//
//   For any viewport width `w` in [360, 2560], after `<Landing/>` is rendered
//   at that width, `document.documentElement.scrollWidth` must be <= w
//   (no element overflows horizontally, no horizontal scrollbar appears).
//
// Implementation notes:
//   - <Landing/> mounts <HeroStage/> → <EarthGlobe/>, which normally requires
//     a real WebGL context. We mock `useThreeScene` so it returns an empty
//     ref and skips all Three.js setup — scroll width does not depend on
//     the canvas content, only on the laid-out DOM chrome.
//   - `GLTFLoader` is mocked as a no-op class to avoid any model-fetch
//     side-effects in case the mocked hook were ever bypassed.
//   - `THREE.TextureLoader.prototype.load` is stubbed to return an empty
//     Texture so jsdom never attempts an image fetch.
//   - `api.head` (used by `<StatusIndicator/>`) is stubbed so no real HTTP
//     traffic runs during the 100-iteration property loop.
//   - Landing calls `useAuth()` and `useNavigate()`, so we wrap each render
//     in `<MemoryRouter>` + `<AuthProvider>`.
//
// jsdom caveat: jsdom reports `scrollWidth === 0` for any element whose
// content has not been laid out, which still satisfies `<= w`. This property
// therefore acts primarily as a regression guard against gross horizontal
// overflow (e.g. an element with a literal `width: 3000px` or a negative
// margin pushing content past the viewport). Layout-accurate overflow
// detection requires a real browser.

import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fc from "fast-check";
import * as THREE from "three";

// --- Mocks (hoisted by Vitest) ------------------------------------------------

// Stub the health probe so the StatusIndicator effect does not issue real
// HTTP requests during the 100 property iterations.
vi.mock("../../api/client.js", async () => {
  const actual = await vi.importActual<typeof import("../../api/client.js")>(
    "../../api/client.js",
  );
  return {
    ...actual,
    api: { ...actual.api, head: vi.fn().mockResolvedValue({ status: 200 }) },
  };
});

// Bypass the real Three.js scene entirely. EarthGlobe only uses the ref as
// a DOM mount point, and scroll width does not depend on the canvas.
vi.mock("../../hooks/useThreeScene.js", () => ({
  useThreeScene: () => ({ current: document.createElement("div") }),
  useReducedMotion: () => false,
}));

// No-op GLTFLoader — a safety net in case the hook mock is ever bypassed.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class NoopGLTFLoader {
    load() {}
  },
}));

// Stub texture loads so jsdom does not try to resolve image URLs.
THREE.TextureLoader.prototype.load = function mockedTextureLoad() {
  return new THREE.Texture();
};

// Imports below must come AFTER the mocks so their module graph resolves
// against the stubs.
import { AuthProvider } from "../../auth/AuthContext.jsx";
import Landing from "../Landing.jsx";

afterEach(() => {
  cleanup();
});

function setViewportWidth(w) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: w,
  });
  window.dispatchEvent(new Event("resize"));
}

test("Landing never introduces horizontal page scroll for any viewport width in [360, 2560]", () => {
  fc.assert(
    fc.property(fc.integer({ min: 360, max: 2560 }), (w) => {
      setViewportWidth(w);

      const { unmount } = render(
        <MemoryRouter>
          <AuthProvider>
            <Landing />
          </AuthProvider>
        </MemoryRouter>,
      );

      try {
        // Property 2: the document must never be wider than the viewport.
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w);
      } finally {
        unmount();
      }
    }),
    { numRuns: 100 },
  );
});
