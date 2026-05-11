// Feature: globe-hero-ui, Property 4: satellite orbital invariants
// (fixed inclined orbit, |p| ≈ 2.05 ± 0.02, handedness consistent along
// the orbit normal).

import React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fc from "fast-check";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Mock GLTFLoader so `load` synchronously invokes `onLoad` with a stub scene
// of a known size (≈ 0.2 × 0.15 × 0.1). This lets setupScene attach the
// model to the orbit group without any async/network work.
// ---------------------------------------------------------------------------
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => {
  class GLTFLoader {
    load(_url, onLoad) {
      const group = new THREE.Group();
      group.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.15, 0.1),
          new THREE.MeshBasicMaterial(),
        ),
      );
      onLoad({ scene: group });
    }
  }
  return { GLTFLoader };
});

// ---------------------------------------------------------------------------
// Mock useThreeScene so the `setupScene` callback is captured rather than
// invoked inside a RAF loop against a WebGL context. The component renders
// successfully (the mock returns a ref-like object); the test then runs
// setupScene manually with a fresh, JS-only scene graph on each iteration.
// ---------------------------------------------------------------------------
const captured = { setupScene: null, options: null };
vi.mock("../../../hooks/useThreeScene.js", () => ({
  useThreeScene: (setupScene, options) => {
    captured.setupScene = setupScene;
    captured.options = options;
    return { current: document.createElement("div") };
  },
  useReducedMotion: () => false,
}));

// Import AFTER the mocks so EarthGlobe binds to the mocked modules.
// eslint-disable-next-line import/first
import EarthGlobe from "../EarthGlobe.jsx";

const ROTATION_X = THREE.MathUtils.degToRad(26);
const ROTATION_Z = THREE.MathUtils.degToRad(-12);
const ORBIT_RADIUS = 2.05;
const RADIUS_TOLERANCE = 0.02;

// Must match the prefersReducedMotion=false branch of EarthGlobe's animator.
// Used to bound the angular step between adjacent samples so the cross
// product sign is a well-defined orbit-direction indicator (|Δθ| ≤ π).
const ORBIT_SPEED = 0.32;
const MAX_GAP_SECONDS = Math.PI / ORBIT_SPEED;

// Cross products near zero (two nearly-parallel or identical positions)
// carry no directional signal and are ignored when checking handedness.
const SIGN_EPS = 1e-9;

/**
 * Invoke the captured setupScene callback against a fresh THREE scene and
 * return the controller along with the scene graph so the test can read the
 * orbit/satellite groups and drive the animator manually.
 */
function invokeSetup() {
  if (typeof captured.setupScene !== "function") {
    throw new Error("setupScene was not captured by the useThreeScene mock");
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  const controller =
    captured.setupScene({
      THREE,
      scene,
      camera,
      container: document.createElement("div"),
      renderer: { domElement: document.createElement("canvas") },
      prefersReducedMotion: false,
    }) || {};
  return { scene, controller };
}

function findOrbitGroup(scene) {
  return scene.children.find(
    (child) =>
      child.isGroup &&
      Math.abs(child.rotation.x - ROTATION_X) < 1e-9 &&
      Math.abs(child.rotation.z - ROTATION_Z) < 1e-9,
  );
}

function findSatelliteWrapper(orbit) {
  return orbit.children.find(
    (child) =>
      child.isGroup &&
      Math.abs(child.position.x - ORBIT_RADIUS) < 1e-9 &&
      child.position.y === 0 &&
      child.position.z === 0,
  );
}

beforeEach(() => {
  captured.setupScene = null;
  captured.options = null;
});

afterEach(() => {
  cleanup();
});

describe("EarthGlobe orbital invariants (Property 4)", () => {
  /**
   * Validates: Requirements 4.4 (Property 4)
   *
   * For any monotonically increasing sample of times in [0, 60] seconds, the
   * satellite's world-space position stays on the inclined orbital sphere of
   * radius 2.05 ± 0.02, and it traverses the orbit in a single rotational
   * direction — the signed projection of p(t_i) × p(t_{i+1}) onto the orbit
   * normal keeps a consistent sign. The orbit group's fixed inclination
   * (`rotation.x = deg2rad(26)`, `rotation.z = deg2rad(-12)`) is preserved
   * at every animation step.
   */
  test("|p(t)| stays near 2.05, handedness is consistent, and inclination is fixed", () => {
    // One render primes the captured setupScene closure; fresh scenes are
    // built per iteration inside invokeSetup().
    render(React.createElement(EarthGlobe));
    expect(captured.setupScene).toBeInstanceOf(Function);

    const timesArb = fc
      .array(fc.float({ min: 0, max: 60, noNaN: true }), {
        minLength: 2,
        maxLength: 10,
      })
      .map((ts) => {
        // Sort ascending so every adjacent pair satisfies t1 < t2, then drop
        // near-duplicates that would make the cross product identically zero.
        const sorted = [...ts].sort((a, b) => a - b);
        const out = [];
        for (const t of sorted) {
          if (out.length === 0 || t - out[out.length - 1] > 1e-6) {
            out.push(t);
          }
        }
        return out;
      })
      .filter((ts) => ts.length >= 2);

    fc.assert(
      fc.property(timesArb, (times) => {
        const { scene, controller } = invokeSetup();
        const orbit = findOrbitGroup(scene);
        expect(orbit).toBeDefined();
        const satelliteWrapper = findSatelliteWrapper(orbit);
        expect(satelliteWrapper).toBeDefined();
        expect(controller.animate).toBeInstanceOf(Function);

        // The orbit normal is the orbit group's local +Y axis transformed by
        // its fixed inclination. The animator only mutates rotation.y (a
        // rotation AROUND that axis), so this vector is invariant across the
        // entire sample — perfect for projecting cross products onto.
        scene.updateMatrixWorld(true);
        const orbitNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(
          orbit.getWorldQuaternion(new THREE.Quaternion()),
        );

        const positions = [];
        let prev = 0;
        for (const t of times) {
          const delta = t - prev;
          prev = t;

          controller.animate({
            delta,
            elapsed: t,
            prefersReducedMotion: false,
          });

          // Inclination must be untouched by the animator at every step.
          expect(orbit.rotation.x).toBe(ROTATION_X);
          expect(orbit.rotation.z).toBe(ROTATION_Z);

          scene.updateMatrixWorld(true);
          const p = satelliteWrapper.getWorldPosition(new THREE.Vector3());
          // |p| ≈ 2.05 ± 0.02 at every sample time.
          expect(Math.abs(p.length() - ORBIT_RADIUS)).toBeLessThanOrEqual(
            RADIUS_TOLERANCE,
          );
          positions.push(p);
        }

        // Handedness invariant: for every adjacent pair whose angular step is
        // under a half period, the signed projection of p_i × p_{i+1} onto
        // the orbit normal has the same sign throughout the sample. Pairs
        // whose step spans more than π are skipped — the cross product flips
        // sign past that point and no longer indicates orbit direction, so
        // the property is undefined (not violated) there.
        let referenceSign = 0;
        for (let i = 0; i + 1 < positions.length; i += 1) {
          const gap = times[i + 1] - times[i];
          if (gap > MAX_GAP_SECONDS) continue;

          const cross = new THREE.Vector3().crossVectors(
            positions[i],
            positions[i + 1],
          );
          const signed = cross.dot(orbitNormal);
          if (Math.abs(signed) < SIGN_EPS) continue;

          const sign = signed > 0 ? 1 : -1;
          if (referenceSign === 0) {
            referenceSign = sign;
          } else {
            expect(sign).toBe(referenceSign);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
