// Feature: globe-hero-ui, Property 6: scene errors are contained and do not propagate
//
// Strategy:
//   - Mock `useThreeScene` so it synchronously invokes the component's
//     `setupScene` against a real THREE scene we can inspect after render.
//   - Mock `GLTFLoader.load` so every invocation synchronously calls the
//     `onError` callback with a fast-check-generated error.
//   - Stub `THREE.TextureLoader.prototype.load` so it also invokes any
//     supplied `onError` callback with the generated error and returns a
//     fresh (empty) Texture, satisfying the task's requirement that both
//     loaders invoke their error callbacks while preventing jsdom Image()
//     noise from polluting the console.
//   - For each fc run: spy on `console.error`, attach an `unhandledrejection`
//     listener to `window`, render `<EarthGlobe />`, await a microtask,
//     unmount, and assert that no unhandled errors surfaced and that the
//     orbit group keeps a procedural fallback satellite.

import { test, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";
import * as THREE from "three";

// ---- Shared state between mocks and the test bodies -----------------------
// The mocked `useThreeScene` stashes the constructed scene here after each
// render so the property body can inspect the orbit group. The mocked
// GLTFLoader reads the current `nextError` so each fc iteration can feed
// a different generated error into the scene.
const sceneState = { scene: null, nextError: null };
globalThis.__SCENE_ERRORS_TEST__ = sceneState;

// ---- Mocks (hoisted by Vitest to the top of the module) -------------------

vi.mock("../../../hooks/useThreeScene.js", async () => {
  const ThreeModule = await import("three");
  return {
    useThreeScene: (setupScene) => {
      const state = globalThis.__SCENE_ERRORS_TEST__;
      const scene = new ThreeModule.Scene();
      const camera = new ThreeModule.PerspectiveCamera(50, 1, 0.1, 1000);
      const container = document.createElement("div");
      const renderer = { domElement: document.createElement("canvas") };

      state.scene = scene;

      setupScene?.({
        THREE: ThreeModule,
        camera,
        container,
        renderer,
        scene,
        prefersReducedMotion: false,
      });

      return { current: container };
    },
    useReducedMotion: () => false,
  };
});

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class MockFailingGLTFLoader {
    load(_url, _onLoad, _onProgress, onError) {
      const err = globalThis.__SCENE_ERRORS_TEST__.nextError;
      // Per Property 6: synchronously invoke the error callback so the
      // component's error path runs during setupScene. EarthGlobe's onError
      // handler uses `console.warn`, which is allowed by Property 6.
      onError?.(err);
    }
  },
}));

// EarthGlobe must be imported AFTER the mocks are registered so its module
// graph resolves against the stubs above.
import EarthGlobe from "../EarthGlobe.jsx";

// ---- Generator ------------------------------------------------------------
// Covers the four error shapes the scene is expected to tolerate:
//   - a built-in TypeError
//   - a plain Error with a realistic message
//   - a DOMException (the shape emitted by AbortController.abort())
//   - an arbitrary string-wrapped Error produced by fc.string()
const errorArb = fc.oneof(
  fc.constantFrom(
    new TypeError("x"),
    new Error("corrupt glb"),
    new DOMException("abort", "AbortError"),
  ),
  fc.string().map((m) => new Error(m)),
);

// ---- Property 6 -----------------------------------------------------------

/**
 * Validates: Requirements 4.7, 4.8 (Property 6)
 *
 * For any error injected into the `GLTFLoader.load` / `TextureLoader.load`
 * error callbacks, `<EarthGlobe />` must mount, run through its error path,
 * and unmount without:
 *   - emitting a `console.error` from component code (informational
 *     `console.warn` is allowed per the design doc),
 *   - firing an `unhandledrejection` event on `window`,
 *   - leaving the orbit without a fallback satellite when the glTF load fails.
 */
test("scene errors from GLTFLoader / TextureLoader are contained without surfacing unhandled errors", async () => {
  await fc.assert(
    fc.asyncProperty(errorArb, async (err) => {
      sceneState.scene = null;
      sceneState.nextError = err;

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const unhandledEvents = [];
      const onUnhandledRejection = (event) => {
        unhandledEvents.push(event);
      };
      window.addEventListener("unhandledrejection", onUnhandledRejection);

      // Stub TextureLoader so it (a) fires the error callback with the
      // generated error when one is supplied (per the task spec), and
      // (b) returns a fresh Texture so downstream scene setup continues
      // rather than throwing inside the component's `try` block.
      const textureLoadSpy = vi
        .spyOn(THREE.TextureLoader.prototype, "load")
        .mockImplementation(function mockedTextureLoad(
          _url,
          _onLoad,
          _onProgress,
          onErr,
        ) {
          onErr?.(err);
          return new THREE.Texture();
        });

      let view;
      try {
        view = render(<EarthGlobe />);
        // Flush any queued microtasks (e.g. a deferred unhandledrejection
        // dispatch) before inspecting the scene graph.
        await Promise.resolve();

        const scene = sceneState.scene;
        expect(scene).toBeTruthy();

        // Locate the inclined orbit group by its distinctive X rotation
        // (set to `deg2rad(26)` in EarthGlobe.jsx).
        const orbit = scene.children.find(
          (child) =>
            child.isGroup &&
            Math.abs(child.rotation.x - THREE.MathUtils.degToRad(26)) < 1e-6,
        );
        expect(orbit).toBeTruthy();

        // Property 6 assertion: when the glTF loader fails, the orbit group
        // keeps a procedural fallback so the presentation never shows an
        // empty orbit.
        const fallbackWrapper = orbit.children.find(
          (child) => child.name === "ISSSatelliteWrapper",
        );
        expect(fallbackWrapper).toBeTruthy();

        let foundProceduralFallback = false;
        fallbackWrapper.traverse((child) => {
          if (child.userData?.isProceduralSatellite) {
            foundProceduralFallback = true;
          }
        });
        expect(foundProceduralFallback).toBe(true);

        // No `console.error` should have originated from EarthGlobe's own
        // code path (it uses `console.warn` for the fallback message).
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        // No `unhandledrejection` events should have fired during the
        // mount → microtask → unmount cycle.
        expect(unhandledEvents).toHaveLength(0);
      } finally {
        view?.unmount();
        cleanup();
        window.removeEventListener(
          "unhandledrejection",
          onUnhandledRejection,
        );
        textureLoadSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      }
    }),
    { numRuns: 100 },
  );
});
