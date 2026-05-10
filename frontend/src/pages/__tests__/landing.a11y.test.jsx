// Feature: globe-hero-ui, a11y snapshot for Landing
// Validates: Requirements 8.1, 8.2, 8.4, 8.5
//
// Runs axe against the landing page at the default jsdom viewport and again
// at 1280x800 (desktop) and 414x896 (mobile) after a jsdom resize. We mock
// the heavy 3D and network dependencies so the test can focus on markup and
// ARIA semantics rather than WebGL or backend availability.
//
// Note on color-contrast: jsdom cannot compute real paint (backdrop-filter
// in particular resolves to an empty string), so axe's color-contrast rule
// is unreliable here. We disable it explicitly and validate contrast
// manually against the design tokens.

import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// Mock useThreeScene so neither EarthGlobe nor Starfield boots three.js.
// Returning a ref whose .current is null is enough — setupScene is never
// invoked, so GLTFLoader / TextureLoader are never instantiated from within
// the component.
vi.mock("../../hooks/useThreeScene.js", () => ({
  useThreeScene: () => ({ current: null }),
  useReducedMotion: () => false,
}));

// Defensive stub for GLTFLoader in case the module graph reaches it through
// some other path. `load` is a no-op so nothing async settles mid-test.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class MockGLTFLoader {
    load() {}
  },
}));

// Mock the shared api client. AuthProvider pulls several helpers from here
// at mount time; StatusIndicator polls `api.head`. Stub everything Landing +
// AuthProvider might touch so no real network call escapes the test.
vi.mock("../../api/client.js", () => ({
  api: { head: vi.fn(() => new Promise(() => {})) },
  getStoredAuth: vi.fn(() => null),
  persistAuth: vi.fn(),
  clearStoredAuth: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getErrorMessage: (err, fallback = "Something went wrong.") =>
    err?.message || fallback,
}));

// TextureLoader lives on the `three` namespace and is `new`'d inside
// EarthGlobe's setupScene. Because useThreeScene is mocked, setupScene never
// runs, but we spy on the prototype defensively — if a future change reaches
// TextureLoader through another path, this prevents jsdom from attempting a
// real image fetch and emitting console noise.
import * as THREE from "three";
vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
  function mockedTextureLoad() {
    return new THREE.Texture();
  },
);

import { AuthProvider } from "../../auth/AuthContext.jsx";
import Landing from "../Landing.jsx";

afterEach(() => {
  cleanup();
});

function setViewport(width, height) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event("resize"));
}

function renderLanding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Landing />
      </AuthProvider>
    </MemoryRouter>,
  );
}

// jsdom cannot compute backdrop-filter or real paint, which makes
// color-contrast checks unreliable. Disable that one rule; every other WCAG
// check (roles, names, landmarks, focus order, aria-hidden, etc.) still runs.
const axeOptions = {
  rules: { "color-contrast": { enabled: false } },
};

test("Landing has no axe violations at the default jsdom viewport (Req 8.1, 8.2, 8.4, 8.5)", async () => {
  const { container } = renderLanding();
  const results = await axe(container, axeOptions);
  expect(results).toHaveNoViolations();
});

test("Landing has no axe violations at 1280x800 desktop (Req 8.1, 8.2, 8.4, 8.5)", async () => {
  setViewport(1280, 800);
  const { container } = renderLanding();
  const results = await axe(container, axeOptions);
  expect(results).toHaveNoViolations();
});

test("Landing has no axe violations at 414x896 mobile (Req 8.1, 8.2, 8.4, 8.5)", async () => {
  setViewport(414, 896);
  const { container } = renderLanding();
  const results = await axe(container, axeOptions);
  expect(results).toHaveNoViolations();
});
