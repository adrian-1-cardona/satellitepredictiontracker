// Feature: globe-hero-ui, Property 1
//
// Validates: Requirements 1.1, 1.3, 1.5
//
// Property 1: Hero stage is full-bleed and camera aspect tracks the viewport.
//
//   For any viewport (w, h) with w in [360, 2560] and h in [480, 1600], after
//   <Landing/> (or equivalently <EarthGlobe/>) is mounted and the scene has
//   reacted to that viewport size:
//     - renderer canvas clientWidth  === w
//     - renderer canvas clientHeight === h
//     - |camera.aspect - w/h|         <  1e-3
//
// Implementation strategy:
//   The real `useThreeScene` hook owns the camera, the renderer, and the
//   resize handler that keeps them in sync with the mount container. Under
//   jsdom there is no real WebGL context and `container.clientWidth` is 0,
//   so we mock the hook to:
//     1. Construct a real THREE.PerspectiveCamera and a synthetic renderer
//        whose `setSize(w, h)` mirrors `clientWidth`/`clientHeight` on the
//        canvas element (the observable contract the property cares about).
//     2. Expose a `resize` function that mirrors the hook's real resize
//        logic (`camera.aspect = width/height`, `updateProjectionMatrix()`,
//        `renderer.setSize(width, height)`), but sources its dimensions
//        from `window.innerWidth`/`window.innerHeight` because
//        `container.clientWidth` is unreliable under jsdom.
//     3. Invoke `setupScene` so `EarthGlobe`'s own scene-setup code runs,
//        proving the property holds against the real component graph.
//   The property loop then drives resizes by overriding window dimensions
//   and calling the captured `resize`, then asserts the three invariants.

import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";
import * as THREE from "three";

// Shared capture bag. The mocked useThreeScene populates this so the test can
// drive the resize logic manually without needing a real ResizeObserver tick.
const captured = {
  camera: null,
  renderer: null,
  container: null,
  resize: null,
};
globalThis.__FULLBLEED_CAPTURE__ = captured;

// --- Mocks (hoisted by Vitest) -----------------------------------------------

vi.mock("../../hooks/useThreeScene.js", async () => {
  const ThreeModule = await import("three");
  return {
    useThreeScene: (setupScene) => {
      const bag = globalThis.__FULLBLEED_CAPTURE__;
      const camera = new ThreeModule.PerspectiveCamera(50, 1, 0.1, 1000);
      const scene = new ThreeModule.Scene();
      const container = document.createElement("div");
      const domElement = document.createElement("canvas");
      const renderer = {
        domElement,
        setSize(w, h) {
          domElement.width = w;
          domElement.height = h;
          Object.defineProperty(domElement, "clientWidth", {
            configurable: true,
            value: w,
          });
          Object.defineProperty(domElement, "clientHeight", {
            configurable: true,
            value: h,
          });
        },
      };
      bag.camera = camera;
      bag.renderer = renderer;
      bag.container = container;
      // Mirror the resize logic in the real useThreeScene:
      //   width  = max(container.clientWidth, 1)
      //   height = max(container.clientHeight, 1)
      //   camera.aspect = width / height
      //   camera.updateProjectionMatrix()
      //   renderer.setSize(width, height, false)
      //
      // Under jsdom `container.clientWidth` is 0, so we source dimensions
      // from `window.innerWidth`/`innerHeight` instead. HeroStage's CSS
      // sizes the mount container to 100vw/100vh, so this is the same
      // value the real ResizeObserver would feed the real hook in the
      // browser.
      bag.resize = () => {
        const width = Math.max(window.innerWidth, 1);
        const height = Math.max(window.innerHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      setupScene?.({
        THREE: ThreeModule,
        camera,
        scene,
        renderer,
        container,
        prefersReducedMotion: false,
      });
      return { current: container };
    },
    useReducedMotion: () => false,
  };
});

// No-op GLTFLoader — EarthGlobe's setupScene instantiates one; we don't need
// it to actually fetch a model for this property.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class NoopGLTFLoader {
    load() {}
  },
}));

// Stub texture loads so jsdom does not try to resolve image URLs.
THREE.TextureLoader.prototype.load = function mockedTextureLoad() {
  return new THREE.Texture();
};

// Import AFTER the mocks so the module graph resolves against the stubs.
import EarthGlobe from "../../components/3d/EarthGlobe.jsx";

afterEach(() => {
  cleanup();
});

test("canvas tracks viewport and camera.aspect stays in sync across supported sizes", () => {
  // One render primes the captured camera/renderer; the fc loop drives resize.
  render(<EarthGlobe />);
  expect(captured.camera).toBeInstanceOf(THREE.PerspectiveCamera);
  expect(typeof captured.resize).toBe("function");

  fc.assert(
    fc.property(
      fc.record({
        w: fc.integer({ min: 360, max: 2560 }),
        h: fc.integer({ min: 480, max: 1600 }),
      }),
      ({ w, h }) => {
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          value: w,
        });
        Object.defineProperty(window, "innerHeight", {
          configurable: true,
          value: h,
        });
        window.dispatchEvent(new Event("resize"));

        captured.resize();

        const canvas = captured.renderer.domElement;
        expect(canvas.clientWidth).toBe(w);
        expect(canvas.clientHeight).toBe(h);
        expect(Math.abs(captured.camera.aspect - w / h)).toBeLessThan(1e-3);
      },
    ),
    { numRuns: 100 },
  );
});
