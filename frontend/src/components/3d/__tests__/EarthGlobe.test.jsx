// Feature: globe-hero-ui — example-based unit tests for EarthGlobe
// Validates: Req 4.1 (glTF satellite replaces primitives) and Req 4.6
// (reduced-motion orbital / self-spin speeds).
//
// Strategy: mock `useThreeScene` so we can synchronously invoke the component's
// `setupScene` against a fresh `THREE.Scene`, capture the resulting scene graph
// and animation controller on a test-scoped global, and then assert on them.
// We also mock `GLTFLoader` so the async model load resolves synchronously
// with a predictable, test-visible scene node named "LoadedGLTFMock".

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import * as THREE from "three";

// Shared handoff between the mocks and the test bodies. Reset in beforeEach.
const captured = {
  scene: null,
  controller: null,
  camera: null,
  lastModelUrl: null,
  prefersReducedMotion: false,
};
globalThis.__CAPTURED_EARTH_GLOBE__ = captured;

// ---- Mocks (hoisted to the top of the module by Vitest) -------------------

// Replace `useThreeScene` with a synchronous runner: build a real Scene and
// PerspectiveCamera, invoke the component's `setupScene` with them, and stash
// the scene + controller on the shared capture object. Return a plain
// RefObject so React's ref assignment still works.
vi.mock("../../../hooks/useThreeScene.js", async () => {
  const ThreeModule = await import("three");
  return {
    useThreeScene: (setupScene /* options */) => {
      const bag = globalThis.__CAPTURED_EARTH_GLOBE__;
      const scene = new ThreeModule.Scene();
      const camera = new ThreeModule.PerspectiveCamera(50, 1, 0.1, 1000);
      const container = document.createElement("div");
      const renderer = { domElement: document.createElement("canvas") };

      bag.scene = scene;
      bag.camera = camera;

      const controller =
        setupScene?.({
          THREE: ThreeModule,
          camera,
          container,
          renderer,
          scene,
          prefersReducedMotion: Boolean(bag.prefersReducedMotion),
        }) || {};
      bag.controller = controller;

      return { current: container };
    },
    useReducedMotion: () =>
      Boolean(globalThis.__CAPTURED_EARTH_GLOBE__.prefersReducedMotion),
  };
});

// Replace GLTFLoader with a stub that synchronously resolves `load` by
// invoking `onLoad` with a Group named "LoadedGLTFMock" containing a single
// distinctive child mesh. Records the URL so the default-modelUrl test can
// verify the component is asking for `/models/iss.glb`.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", async () => {
  const ThreeModule = await import("three");
  return {
    GLTFLoader: class MockGLTFLoader {
      load(url, onLoad /* onProgress, onError */) {
        globalThis.__CAPTURED_EARTH_GLOBE__.lastModelUrl = url;
        const modelScene = new ThreeModule.Group();
        modelScene.name = "LoadedGLTFMock";
        const mesh = new ThreeModule.Mesh(
          new ThreeModule.BoxGeometry(0.2, 0.2, 0.2),
          new ThreeModule.MeshStandardMaterial(),
        );
        mesh.name = "LoadedGLTFMockMesh";
        modelScene.add(mesh);
        onLoad?.({ scene: modelScene });
      }
    },
  };
});

// The component must be imported AFTER the mocks are registered so its
// module graph resolves against the stubs.
import EarthGlobe from "../EarthGlobe.jsx";
import { CONSTELLATION_SATELLITE_COUNT } from "../constellationData.js";

// ---- Helpers --------------------------------------------------------------

function mockMatchMedia(prefersReduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches:
      query === "(prefers-reduced-motion: reduce)" ? prefersReduced : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function findOrbitGroup(scene) {
  return scene.children.find(
    (child) =>
      child.isGroup &&
      Math.abs(child.rotation.x - THREE.MathUtils.degToRad(26)) < 1e-4,
  );
}

function findSatelliteWrapper(orbit) {
  return orbit.children.find(
    (child) => child.isGroup && Math.abs(child.position.x - 2.05) < 1e-3,
  );
}

function findEarthMesh(scene) {
  let earth = null;
  scene.traverse((child) => {
    if (earth) return;
    if (
      child.isMesh &&
      child.geometry?.type === "SphereGeometry" &&
      Math.abs((child.geometry.parameters?.radius ?? 0) - 1.4) < 1e-6
    ) {
      earth = child;
    }
  });
  return earth;
}

function findConstellationRoot(scene) {
  return scene.children.find(
    (child) => child.name === "EarthSatelliteConstellation",
  );
}

// ---- Lifecycle ------------------------------------------------------------

beforeEach(() => {
  const bag = globalThis.__CAPTURED_EARTH_GLOBE__;
  bag.scene = null;
  bag.controller = null;
  bag.camera = null;
  bag.lastModelUrl = null;
  bag.prefersReducedMotion = false;

  // Prevent the real TextureLoader from trying to fetch images under jsdom
  // (which would produce console noise and no-op warnings). We still hand
  // back a real Texture so downstream code that sets `.colorSpace` etc. keeps
  // working.
  vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
    function mockedTextureLoad() {
      return new THREE.Texture();
    },
  );

  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---- Tests ----------------------------------------------------------------

describe("EarthGlobe", () => {
  test("defaults modelUrl to /models/iss.glb", () => {
    render(<EarthGlobe />);
    expect(globalThis.__CAPTURED_EARTH_GLOBE__.lastModelUrl).toBe(
      "/models/iss.glb",
    );
  });

  test("attaches the loaded glTF scene to the inclined orbit's satellite wrapper", () => {
    render(<EarthGlobe />);
    const { scene } = globalThis.__CAPTURED_EARTH_GLOBE__;
    expect(scene).toBeTruthy();

    const orbit = findOrbitGroup(scene);
    expect(orbit).toBeTruthy();
    expect(orbit.rotation.z).toBeCloseTo(THREE.MathUtils.degToRad(-12), 4);

    const satelliteWrapper = findSatelliteWrapper(orbit);
    expect(satelliteWrapper).toBeTruthy();

    let foundLoadedModel = false;
    satelliteWrapper.traverse((child) => {
      if (child.name === "LoadedGLTFMock") foundLoadedModel = true;
    });
    expect(foundLoadedModel).toBe(true);
  });

  test("renders a multi-plane procedural constellation around the ISS orbit", () => {
    render(<EarthGlobe />);
    const { scene } = globalThis.__CAPTURED_EARTH_GLOBE__;
    expect(scene).toBeTruthy();

    const constellationRoot = findConstellationRoot(scene);
    expect(constellationRoot).toBeTruthy();
    expect(constellationRoot.children).toHaveLength(5);

    let satelliteCount = 0;
    scene.traverse((child) => {
      if (child.name?.startsWith("ConstellationSatellite:")) {
        satelliteCount += 1;
      }
    });

    expect(satelliteCount).toBe(CONSTELLATION_SATELLITE_COUNT);
  });

  test("no primitive box-body or cone-dish mesh survives from the old satellite", () => {
    render(<EarthGlobe />);
    const { scene } = globalThis.__CAPTURED_EARTH_GLOBE__;
    expect(scene).toBeTruthy();

    let foundOldBody = false;
    let foundOldDish = false;

    scene.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geometry = child.geometry;

      if (geometry.type === "BoxGeometry") {
        const p = geometry.parameters ?? {};
        // The old primitive satellite body had these exact dimensions; any
        // BoxGeometry with these params means the primitive satellite leaked.
        if (
          Math.abs((p.width ?? NaN) - 0.14) < 1e-6 &&
          Math.abs((p.height ?? NaN) - 0.1) < 1e-6 &&
          Math.abs((p.depth ?? NaN) - 0.12) < 1e-6
        ) {
          foundOldBody = true;
        }
      }

      if (geometry.type === "ConeGeometry") {
        // The old primitive satellite was the only source of a ConeGeometry
        // in this scene. A real glTF model will not use ConeGeometry.
        foundOldDish = true;
      }
    });

    expect(foundOldBody).toBe(false);
    expect(foundOldDish).toBe(false);
  });

  test("uses reduced orbit and self-spin speeds when prefers-reduced-motion is reduce", () => {
    mockMatchMedia(true);
    globalThis.__CAPTURED_EARTH_GLOBE__.prefersReducedMotion = true;

    render(<EarthGlobe />);
    const { scene, controller } = globalThis.__CAPTURED_EARTH_GLOBE__;
    expect(controller).toBeTruthy();
    expect(typeof controller.animate).toBe("function");

    const orbit = findOrbitGroup(scene);
    expect(orbit).toBeTruthy();
    const earth = findEarthMesh(scene);
    expect(earth).toBeTruthy();

    // Start from a known rotation so the delta is unambiguous.
    orbit.rotation.y = 0;
    earth.rotation.y = 0;

    controller.animate({ delta: 1, elapsed: 1, prefersReducedMotion: true });

    // Reduced-motion speeds from EarthGlobe.jsx:
    //   earthSpeed = 0.02  (normal would be 0.055)
    //   orbitSpeed = 0.08  (normal would be 0.32)
    expect(earth.rotation.y).toBeCloseTo(0.02, 4);
    expect(orbit.rotation.y).toBeCloseTo(0.08, 4);
  });
});
