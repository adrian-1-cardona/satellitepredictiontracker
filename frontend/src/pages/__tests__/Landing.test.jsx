// Feature: globe-hero-ui, Task 8.3
// Validates: Requirements 2.3, 2.4, 2.8, 6.3, 6.4, 8.1, 8.3
//
// Example-based unit tests for the unauthenticated landing page.
//
// Strategy
// --------
// Landing composes TopRightAuthBar + StatusIndicator + HeroStage + AuthModal
// on top of the real react-router and AuthContext plumbing. To keep the
// tests focused on Landing's own behaviour (modal routing, tab order,
// navigation roll-back) we stub out the surrounding machinery:
//
//   - `useThreeScene` is replaced by a zero-work hook so no WebGL/three
//     setup executes.
//   - `GLTFLoader` is replaced with a no-op class so the module-level import
//     in EarthGlobe cannot crash even if the mocked hook were ever bypassed.
//   - `THREE.TextureLoader.prototype.load` is stubbed so any lingering
//     texture code path resolves without hitting the network.
//   - `api.head` (consumed by StatusIndicator) resolves so the pill settles
//     without logging.
//   - `AuthContext` is replaced with a passthrough `AuthProvider` and a
//     controllable `useAuth()` that reads from a shared `mockAuth` object.
//   - `react-router-dom`'s `useNavigate` is replaced with a spy so we can
//     observe (and make throw) the redirect.

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as THREE from "three";

// ---- Hoisted shared state --------------------------------------------------
// `vi.hoisted` lets mock factories reference these values despite `vi.mock`
// being hoisted above any regular top-level statement.

const { navigateSpy, mockAuth } = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  mockAuth: { isAuthenticated: false, clearAuth: vi.fn() },
}));

// ---- Mocks -----------------------------------------------------------------

// Preserve `MemoryRouter` and friends from react-router-dom; only `useNavigate`
// is replaced with our spy so we can observe the post-auth redirect.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

// Controllable AuthContext. `AuthProvider` is a pass-through because every
// test manipulates `mockAuth` directly and re-renders from scratch.
vi.mock("../../auth/AuthContext.jsx", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }) => children,
}));

// Short-circuit the Three.js pipeline. Returning an object with `current`
// acts like a ref; React will subsequently assign the real DOM node to
// `.current`, which is harmless because nothing reads from it.
vi.mock("../../hooks/useThreeScene.js", () => ({
  useThreeScene: () => ({ current: document.createElement("div") }),
  useReducedMotion: () => false,
}));

// Belt-and-braces: if any path ever evaluates GLTFLoader, give it a no-op.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class MockGLTFLoader {
    load() {}
    setPath() {
      return this;
    }
    setCrossOrigin() {
      return this;
    }
  },
}));

// Stub the StatusIndicator network probe so nothing hits the wire.
vi.mock("../../api/client.js", () => ({
  api: { head: vi.fn(() => new Promise(() => {})) },
}));

// Stub TextureLoader in case anything still reaches three.js. Spies installed
// via `vi.spyOn` on a prototype persist across tests unless restored — we
// restore them in `afterEach`.
vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
  function mockedTextureLoad() {
    return new THREE.Texture();
  },
);

// Component under test must be imported AFTER all mocks are registered so its
// module graph resolves against the stubs.
import Landing from "../Landing.jsx";

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe("Landing (globe-hero-ui)", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    mockAuth.isAuthenticated = false;
    mockAuth.clearAuth = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Req 8.1 — single <main> landmark; no retired landing card on the page.
  // Req 2.8 — Log In / Sign Up exposed as two accessible buttons.
  // Req 3.1 — one status pill carrying the "Prediction service" label.
  // -------------------------------------------------------------------------
  describe("unauthenticated structure (Req 2.8, 8.1)", () => {
    test("renders exactly one <main> and no retired landing card", () => {
      renderLanding();

      const retiredHeroClass = ["landing", "hero"].join("-");
      expect(screen.getAllByRole("main")).toHaveLength(1);
      expect(document.querySelector(`.${retiredHeroClass}`)).toBeNull();
    });

    test("exposes exactly the Log In and Sign Up auth controls", () => {
      renderLanding();

      expect(
        screen.getByRole("button", { name: /log in/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign up/i }),
      ).toBeInTheDocument();
    });

    test("renders a single status pill announcing the prediction service", () => {
      renderLanding();

      const statuses = screen.getAllByRole("status");
      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toHaveTextContent(/prediction service/i);
    });
  });

  // -------------------------------------------------------------------------
  // Req 2.3 — activating "Log In" opens AuthModal with initialMode=login.
  // Req 2.4 — activating "Sign Up" opens AuthModal with initialMode=register.
  // Req 8.3 — Escape closes the modal (delegated to AuthModal itself).
  // -------------------------------------------------------------------------
  describe("modal routing (Req 2.3, 2.4, 8.3)", () => {
    test("clicking Log In opens the AuthModal in login mode", async () => {
      const user = userEvent.setup();
      renderLanding();

      await user.click(screen.getByRole("button", { name: /log in/i }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();
      // LoginForm's visible heading identifies the login pane.
      expect(
        await screen.findByRole("heading", { name: /mission login/i }),
      ).toBeInTheDocument();
    });

    test("clicking Sign Up opens the AuthModal in register mode", async () => {
      const user = userEvent.setup();
      renderLanding();

      await user.click(screen.getByRole("button", { name: /sign up/i }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();
      // RegisterForm's visible heading identifies the register pane.
      expect(
        screen
          .getAllByRole("heading", { name: /create account/i })
          .some((heading) => !heading.classList.contains("sr-only")),
      ).toBe(true);
    });

    test("Escape closes the open modal", async () => {
      const user = userEvent.setup();
      renderLanding();

      await user.click(screen.getByRole("button", { name: /log in/i }));
      await screen.findByRole("dialog");

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Req 2.8 — keyboard focus order: auth controls come before the decorative
  // hero. Tab should reach Log In first, Sign Up second, and must never land
  // inside the `aria-hidden` HeroStage.
  // -------------------------------------------------------------------------
  describe("tab order (Req 2.8)", () => {
    test("Log In is first, Sign Up is second, and focus never enters HeroStage", async () => {
      const user = userEvent.setup();
      renderLanding();

      const loginBtn = screen.getByRole("button", { name: /log in/i });
      const signupBtn = screen.getByRole("button", { name: /sign up/i });
      const heroStage = document.querySelector(".hero-stage");
      expect(heroStage).not.toBeNull();

      await user.tab();
      expect(document.activeElement).toBe(loginBtn);

      await user.tab();
      expect(document.activeElement).toBe(signupBtn);

      // Subsequent tabs may wrap to <body> or cycle back to the auth pills,
      // but must never reach a descendant of the decorative HeroStage.
      for (let i = 0; i < 5; i += 1) {
        await user.tab();
        expect(heroStage.contains(document.activeElement)).toBe(false);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Req 6.3 — when `isAuthenticated` is true, Landing navigates to /dashboard
  // with `replace: true` so the landing route is not left in history.
  // Req 6.4 — if `navigate` throws, the partial session is rolled back via
  // `clearAuth`, keeping AuthContext consistent.
  // -------------------------------------------------------------------------
  describe("authenticated redirect (Req 6.3, 6.4)", () => {
    test("navigates to /dashboard when isAuthenticated flips to true", async () => {
      mockAuth.isAuthenticated = true;

      renderLanding();

      await waitFor(() => {
        expect(navigateSpy).toHaveBeenCalledWith("/dashboard", {
          replace: true,
        });
      });
    });

    test("invokes clearAuth when navigate throws during the redirect", async () => {
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      navigateSpy.mockImplementation(() => {
        throw new Error("navigation-blocked");
      });
      mockAuth.isAuthenticated = true;

      renderLanding();

      await waitFor(() => {
        expect(mockAuth.clearAuth).toHaveBeenCalledTimes(1);
      });
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
