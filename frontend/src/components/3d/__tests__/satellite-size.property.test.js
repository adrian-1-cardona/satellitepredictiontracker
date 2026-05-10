// Feature: globe-hero-ui, Property 5: satellite scale is clamped to [3%, 12%] of earth diameter

import { test, expect } from "vitest";
import fc from "fast-check";

import {
  scaleEarthGlobeSatelliteToEarth,
  scaleModelToEarth,
} from "../satelliteScale.js";

const MIN_RATIO = 0.03;
const MAX_RATIO = 0.12;
const EARTH_GLOBE_MIN_RATIO = 0.04;
const EARTH_GLOBE_MAX_RATIO = 0.18;
// Small epsilon absorbs floating-point rounding at the clamp boundary; the
// mathematical interval is closed at 0.03 and 0.12 per Req 4.5.
const EPSILON = 1e-9;

/**
 * Validates: Requirements 4.5 (Property 5)
 *
 * For any bounded, finite `longestSide` in (0, 1000] and any reasonable
 * `earthRadius`, the scale factor returned by `scaleModelToEarth` must size
 * the model so its longest side falls within [3%, 12%] of the Earth's
 * on-screen diameter (`2 * earthRadius`).
 */
test("scaleModelToEarth keeps the scaled longest side within [3%, 12%] of earth diameter", () => {
  fc.assert(
    fc.property(
      fc.float({
        min: Math.fround(0.001),
        max: 1000,
        noNaN: true,
        noDefaultInfinity: true,
      }),
      fc.float({ min: 0.5, max: 10, noNaN: true, noDefaultInfinity: true }),
      (longestSide, earthRadius) => {
        const scale = scaleModelToEarth(longestSide, earthRadius);
        const ratio = (longestSide * scale) / (2 * earthRadius);

        expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO - EPSILON);
        expect(ratio).toBeLessThanOrEqual(MAX_RATIO + EPSILON);
      }
    ),
    { numRuns: 100 }
  );
});

test("scaleEarthGlobeSatelliteToEarth allows larger visible hero satellites", () => {
  fc.assert(
    fc.property(
      fc.float({
        min: Math.fround(0.001),
        max: 1000,
        noNaN: true,
        noDefaultInfinity: true,
      }),
      fc.float({ min: 0.5, max: 10, noNaN: true, noDefaultInfinity: true }),
      fc.float({
        min: Math.fround(-1),
        max: Math.fround(1),
        noNaN: true,
        noDefaultInfinity: true,
      }),
      (longestSide, earthRadius, target) => {
        const scale = scaleEarthGlobeSatelliteToEarth(
          longestSide,
          earthRadius,
          target,
        );
        const ratio = (longestSide * scale) / (2 * earthRadius);

        expect(ratio).toBeGreaterThanOrEqual(
          EARTH_GLOBE_MIN_RATIO - EPSILON,
        );
        expect(ratio).toBeLessThanOrEqual(EARTH_GLOBE_MAX_RATIO + EPSILON);
      },
    ),
    { numRuns: 100 },
  );
});
