// Feature: globe-hero-ui, Req 4.5 / Property 5
// Pure helper for sizing a glTF satellite model relative to the Earth sphere.
// No three.js imports: this module is plain arithmetic so it can be
// property-tested in isolation.

const MIN_RATIO = 0.03;
const MAX_RATIO = 0.12;
const DEFAULT_TARGET = 0.07;

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
 * @param {number} [target=0.07] - Desired ratio of longest side to Earth diameter.
 * @returns {number} Uniform scale factor, or `0` if inputs are invalid.
 */
export function scaleModelToEarth(longestSide, earthRadius, target = DEFAULT_TARGET) {
  if (!Number.isFinite(longestSide) || longestSide <= 0) return 0;
  if (!Number.isFinite(earthRadius) || earthRadius <= 0) return 0;
  if (!Number.isFinite(target)) return 0;

  const diameter = 2 * earthRadius;

  // Clamp the requested ratio into the allowed band before converting to a scale.
  // This keeps (longestSide * s) / diameter in [MIN_RATIO, MAX_RATIO] regardless
  // of the caller-supplied `target`.
  const clampedRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, target));

  return (clampedRatio * diameter) / longestSide;
}
