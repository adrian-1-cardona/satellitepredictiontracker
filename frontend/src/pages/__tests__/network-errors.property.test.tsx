// Feature: globe-hero-ui, Property 8
//
// Validates: Requirements 8.6
//
// Property 8: No unhandled errors are surfaced when the backend is
// unreachable.
//
//   For any (probeFailure, authFailure) shape drawn from the supported
//   failure universe (network errors, timeouts, and HTTP error statuses),
//   mounting `<Landing/>`, driving a login AND a register attempt through
//   the modal, and unmounting the page MUST NOT:
//     * fire a `window.onerror` event,
//     * fire a `window.unhandledrejection` event,
//     * produce a `console.error` call.
//
//   Additionally, the `StatusIndicator` pill must transition to:
//     * "Online"  when `probeFailure` is an HTTP status (4xx / 5xx) — any
//                 HTTP response proves the server is reachable,
//     * "Offline" when `probeFailure` is "NETWORK" or "TIMEOUT" — no HTTP
//                 response came back, so the server is unreachable.
//
// Strategy
// --------
//   - Mock `useThreeScene` so the WebGL pipeline is a no-op (scroll /
//     canvas content is irrelevant for this property and would otherwise
//     require a real GL context).
//   - Mock `GLTFLoader` + `THREE.TextureLoader.prototype.load` as safety
//     nets in case the hook mock is ever bypassed (the scene's own
//     `console.warn` fallback is allowed per Property 6, but since
//     `useThreeScene` is stubbed out here, those callbacks never fire).
//   - Mock `api/client.js` preserving the real exports (so AuthContext can
//     still import `getStoredAuth`, `clearStoredAuth`, `logoutUser`, and
//     `getErrorMessage`) but replacing `api.head`, `loginUser`, and
//     `registerUser` with fast-check-driven failures.
//   - Wrap `<Landing/>` in a real `<MemoryRouter>` + `<AuthProvider>` so
//     the error-handling seams inside LoginForm / RegisterForm are
//     exercised exactly as they are in production. The form's rendered
//     error banner (role="alert") is expected; it does not emit a
//     `console.error`.

import { test, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  within,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fc from "fast-check";
import * as THREE from "three";

// --- Mocks (hoisted by Vitest) -----------------------------------------------

// Bypass the real Three.js scene entirely. Nothing in Property 8 depends on
// canvas content; the goal is to observe error propagation through the DOM
// and the AuthContext, not the WebGL layer.
vi.mock("../../hooks/useThreeScene.js", () => ({
  useThreeScene: () => ({ current: document.createElement("div") }),
  useReducedMotion: () => false,
}));

// No-op GLTFLoader — safety net in case `useThreeScene`'s setupScene callback
// ever runs (it does not, given the mock above).
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class NoopGLTFLoader {
    load() {}
  },
}));

// Replace api.head / loginUser / registerUser with fast-check-driven fakes,
// while keeping every other export (including `getStoredAuth`,
// `clearStoredAuth`, `logoutUser`, `getErrorMessage`) intact so AuthContext
// and the auth forms continue to behave normally.
vi.mock("../../api/client.js", async () => {
  const actual = await vi.importActual<typeof import("../../api/client.js")>(
    "../../api/client.js",
  );
  return {
    ...actual,
    api: { ...actual.api, head: vi.fn() },
    loginUser: vi.fn(),
    registerUser: vi.fn(),
  };
});

// Stub texture loads so jsdom never tries to resolve image URLs even if a
// stray Three.js code path survives.
THREE.TextureLoader.prototype.load = function mockedTextureLoad() {
  return new THREE.Texture();
};

// Imports below must come AFTER the mocks so their module graph resolves
// against the stubs.
import { api, loginUser, registerUser } from "../../api/client.js";
import { AuthProvider } from "../../auth/AuthContext.jsx";
import Landing from "../Landing.jsx";

// --- Failure generator -------------------------------------------------------
//
// probeFailure:
//   "NETWORK"  → axios-style network error (no response)        → Offline
//   "TIMEOUT"  → axios-style timeout error (no response)        → Offline
//   404/500/502/503 → HTTP error responses (server reachable)  → Online
//
// authFailure:
//   "NETWORK"  → loginUser/registerUser reject with ERR_NETWORK
//   401        → loginUser/registerUser reject with 401 response
//   500        → loginUser/registerUser reject with 500 response
const failureArb = fc.record({
  probeFailure: fc.constantFrom("NETWORK", "TIMEOUT", 500, 502, 503, 404),
  authFailure: fc.constantFrom("NETWORK", 401, 500),
});

/** Translate a probeFailure tag into the rejection payload used by api.head. */
function buildProbeRejection(probeFailure) {
  if (probeFailure === "NETWORK") {
    return { code: "ERR_NETWORK", message: "Network Error" };
  }
  if (probeFailure === "TIMEOUT") {
    return { code: "ECONNABORTED", message: "timeout of 2500ms exceeded" };
  }
  // HTTP error responses — reach the server, so the pill must render Online.
  return { response: { status: probeFailure } };
}

/** Translate an authFailure tag into the rejection payload used by auth RPCs. */
function buildAuthRejection(authFailure) {
  if (authFailure === "NETWORK") {
    return { code: "ERR_NETWORK", message: "Network Error" };
  }
  return { response: { status: authFailure, data: { detail: "nope" } } };
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

afterEach(() => {
  cleanup();
});

/**
 * Validates: Requirements 8.6 (Property 8)
 *
 * For every failure-shape pair, render <Landing/>, drive a login attempt and
 * a register attempt through the modal, unmount, and assert no unhandled
 * errors surfaced and that the StatusIndicator settled on the correct pill.
 */
test("Landing surfaces no unhandled errors for any backend failure shape, and StatusIndicator reflects reachability", async () => {
  await fc.assert(
    fc.asyncProperty(failureArb, async ({ probeFailure, authFailure }) => {
      // --- 1. Reset & configure the mocks for this iteration ---------------
      api.head.mockReset();
      loginUser.mockReset();
      registerUser.mockReset();

      const probeRejection = buildProbeRejection(probeFailure);
      // The probe may fire more than once before unmount if any render loops
      // tick; make it consistently reject with the iteration's shape.
      api.head.mockRejectedValue(probeRejection);

      const authRejection = buildAuthRejection(authFailure);
      loginUser.mockRejectedValue(authRejection);
      registerUser.mockRejectedValue(authRejection);

      // --- 2. Error collectors --------------------------------------------
      const errorEvents = [];
      const onError = vi.fn((event) => {
        errorEvents.push(event);
      });
      const rejectionEvents = [];
      const onRej = vi.fn((event) => {
        rejectionEvents.push(event);
      });
      window.addEventListener("error", onError);
      window.addEventListener("unhandledrejection", onRej);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // --- 3. Render -------------------------------------------------------
      const view = renderLanding();

      try {
        // The StatusIndicator MUST transition from "Checking…" to the pill
        // corresponding to the probe's reachability class.
        const expectedPill =
          typeof probeFailure === "number" ? /online/i : /offline/i;
        await waitFor(() => {
          expect(screen.getByRole("status")).toHaveTextContent(expectedPill);
        });

        // ----- 3a. Drive a login attempt through the modal -----------------
        fireEvent.click(screen.getByRole("button", { name: /log in/i }));

        const loginDialog = await screen.findByRole("dialog");
        // Scope subsequent queries so the TopRightAuthBar buttons do not
        // collide with the modal's own controls.
        const loginWithin = within(loginDialog);

        fireEvent.change(loginWithin.getByLabelText(/email/i), {
          target: { value: "probe@example.com" },
        });
        fireEvent.change(loginWithin.getByLabelText(/password/i), {
          target: { value: "hunter2hunter2" },
        });
        fireEvent.click(
          loginWithin.getByRole("button", { name: /access dashboard/i }),
        );

        // LoginForm renders a role="alert" error banner when `login()`
        // rejects; waiting on it proves the rejection was caught gracefully.
        await within(loginDialog).findByRole("alert");

        // ----- 3b. Switch to register mode via the modal's tab -------------
        fireEvent.click(
          within(loginDialog).getByRole("tab", { name: /sign up/i }),
        );

        // After the tab click the form swaps and the LoginForm's alert is
        // torn down. Wait for the RegisterForm's submit button to mount so
        // we know the re-render has settled before we start typing.
        const registerSubmit = await within(loginDialog).findByRole(
          "button",
          { name: /^sign up$/i },
        );

        fireEvent.change(within(loginDialog).getByLabelText(/email/i), {
          target: { value: "probe@example.com" },
        });
        fireEvent.change(within(loginDialog).getByLabelText(/password/i), {
          target: { value: "hunter2hunter2" },
        });
        fireEvent.click(registerSubmit);

        await within(loginDialog).findByRole("alert");

        // --- 4. Assertions -------------------------------------------------
        // No window-level error events, no unhandled rejections, no
        // console.error calls during the entire mount / interact / unmount
        // cycle (the scene's `console.warn` is allowed but never fires here
        // because `useThreeScene` is mocked).
        expect(errorEvents).toEqual([]);
        expect(onError).not.toHaveBeenCalled();
        expect(rejectionEvents).toEqual([]);
        expect(onRej).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        // Re-assert the pill state after the full interaction: it must
        // still be Online/Offline consistent with the probeFailure class.
        expect(screen.getByRole("status")).toHaveTextContent(expectedPill);
      } finally {
        // --- 5. Teardown ---------------------------------------------------
        view.unmount();
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRej);
        consoleErrorSpy.mockRestore();
        cleanup();
      }
    }),
    { numRuns: 100 },
  );
}, 30_000);
