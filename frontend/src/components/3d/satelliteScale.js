// Feature: globe-hero-ui, Req 4.5 / Property 5
// Pure helper for sizing a glTF satellite model relative to the Earth sphere.
// No three.js imports: this module is plain arithmetic so it can be
// property-tested in isolation.

const MIN_RATIO = 0.03;
const MAX_RATIO = 0.12;
const DEFAULT_TARGET = 0.1;
const EARTH_GLOBE_MIN_RATIO = 0.04;
const EARTH_GLOBE_MAX_RATIO = 0.18;
const EARTH_GLOBE_DEFAULT_TARGET = 0.14;

function scaleToEarthRatio(
  longestSide,
  earthRadius,
  target,
  minRatio,
  maxRatio,
) {
  if (!Number.isFinite(longestSide) || longestSide <= 0) return 0;
  if (!Number.isFinite(earthRadius) || earthRadius <= 0) return 0;
  if (!Number.isFinite(target)) return 0;

  const diameter = 2 * earthRadius;
  const clampedRatio = Math.min(maxRatio, Math.max(minRatio, target));

  return (clampedRatio * diameter) / longestSide;
}

/**
 * Compute a uniform scale factor that sizes a model so its longest side
 * projects to `target` of the Earth sphere's diameter (`2 * earthRadius`),
 * clamped so the resulting ratio stays within the closed interval
 * `[0.03, 0.12]` (Req 4.5).
 *
 * Invariants:
 *   - Given valid inputs, the returned scale `s` satisfies
 *     `0.03 <= (longestSide * s) / (2 * earthRadius) <= 0.12`.
 *   - Zero or non-finite inputs produce `0`, signalling "skip the model"
 *     to the caller rather than throwing.
 *
 * @param {number} longestSide - Longest side of the model's bounding box (world units, pre-scale).
 * @param {number} earthRadius - Radius of the Earth sphere in world units.
 * @param {number} [target=0.1] - Desired ratio of longest side to Earth diameter.
 * @returns {number} Uniform scale factor, or `0` if inputs are invalid.
 */
export function scaleModelToEarth(
  longestSide,
  earthRadius,
  target = DEFAULT_TARGET,
) {
  return scaleToEarthRatio(
    longestSide,
    earthRadius,
    target,
    MIN_RATIO,
    MAX_RATIO,
  );
}

/**
 * Scale satellites used inside EarthGlobe's hero scene. This keeps the generic
 * helper's historical [3%, 12%] sizing band intact while allowing the globe
 * hero to make the ISS prominent and constellation satellites easier to see.
 *
 * @param {number} longestSide - Longest side of the model's bounding box.
 * @param {number} earthRadius - Radius of the Earth sphere in world units.
 * @param {number} [target=0.14] - Desired ratio of longest side to Earth diameter.
 * @returns {number} Uniform scale factor, or `0` if inputs are invalid.
 */
export function scaleEarthGlobeSatelliteToEarth(
  longestSide,
  earthRadius,
  target = EARTH_GLOBE_DEFAULT_TARGET,
) {
  return scaleToEarthRatio(
    longestSide,
    earthRadius,
    target,
    EARTH_GLOBE_MIN_RATIO,
    EARTH_GLOBE_MAX_RATIO,
  );
}
