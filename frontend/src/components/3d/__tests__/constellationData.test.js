import { describe, expect, test } from "vitest";

import {
  CONSTELLATION_SATELLITE_COUNT,
  generateConstellationOrbits,
} from "../constellationData.js";

function allSatellites(orbits) {
  return orbits.flatMap((orbit) =>
    orbit.satellites.map((satellite) => ({ orbit, satellite })),
  );
}

describe("generateConstellationOrbits", () => {
  test("builds a deterministic five-plane constellation with 99 satellites", () => {
    const first = generateConstellationOrbits({ seed: 1234 });
    const second = generateConstellationOrbits({ seed: 1234 });

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(allSatellites(first)).toHaveLength(CONSTELLATION_SATELLITE_COUNT);
    expect(CONSTELLATION_SATELLITE_COUNT).toBe(99);
  });

  test("keeps shell radii, spacing counts, and speeds in expected bands", () => {
    const orbits = generateConstellationOrbits();

    orbits.forEach((orbit) => {
      expect(orbit.satellites.length).toBeGreaterThanOrEqual(15);
      expect(orbit.satellites.length).toBeLessThanOrEqual(30);

      if (orbit.id.startsWith("leo")) {
        expect(orbit.orbitRadius).toBeGreaterThanOrEqual(2.1);
        expect(orbit.orbitRadius).toBeLessThanOrEqual(2.4);
      } else if (orbit.id.startsWith("meo")) {
        expect(orbit.orbitRadius).toBeGreaterThanOrEqual(2.8);
        expect(orbit.orbitRadius).toBeLessThanOrEqual(3.2);
      } else if (orbit.id.startsWith("geo")) {
        expect(orbit.orbitRadius).toBeGreaterThanOrEqual(4);
        expect(Math.abs(orbit.inclination)).toBeLessThanOrEqual(2);
      }
    });

    allSatellites(orbits).forEach(({ satellite }) => {
      expect(satellite.angle).toBeGreaterThanOrEqual(0);
      expect(satellite.angle).toBeLessThan(360);
      expect(satellite.size).toBeGreaterThanOrEqual(0.04);
      expect(satellite.size).toBeLessThanOrEqual(0.09);

      if (satellite.type === "geo") {
        expect(satellite.speed).toBeGreaterThanOrEqual(0.05);
        expect(satellite.speed).toBeLessThanOrEqual(0.1);
      } else if (satellite.type === "meo") {
        expect(satellite.speed).toBeGreaterThanOrEqual(0.2);
        expect(satellite.speed).toBeLessThanOrEqual(0.3);
      } else {
        expect(satellite.speed).toBeGreaterThanOrEqual(0.4);
        expect(satellite.speed).toBeLessThanOrEqual(0.6);
      }
    });
  });
});
