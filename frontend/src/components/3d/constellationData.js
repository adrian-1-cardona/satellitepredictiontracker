const DEFAULT_SEED = 42_710;

const ORBIT_SHELLS = [
  {
    id: "leo-broadband",
    label: "LEO broadband shell",
    orbitRadius: 2.16,
    inclination: 53,
    azimuth: -34,
    count: 28,
    type: "leo",
    speed: 0.54,
    spin: 0.72,
    sizeRange: [0.044, 0.061],
    color: "#7dd3fc",
    trailColor: 0x6ee7ff,
    trailOpacity: 0.2,
    phaseOffset: 6,
  },
  {
    id: "leo-polar",
    label: "LEO polar imaging shell",
    orbitRadius: 2.32,
    inclination: 60,
    azimuth: 22,
    count: 21,
    type: "iridium",
    speed: 0.48,
    spin: 0.64,
    sizeRange: [0.047, 0.066],
    color: "#bae6fd",
    trailColor: 0xa5f3fc,
    trailOpacity: 0.16,
    phaseOffset: 21,
  },
  {
    id: "meo-navigation",
    label: "MEO navigation shell",
    orbitRadius: 2.96,
    inclination: 55,
    azimuth: 69,
    count: 18,
    type: "meo",
    speed: 0.27,
    spin: 0.48,
    sizeRange: [0.055, 0.074],
    color: "#fef3c7",
    trailColor: 0xfacc15,
    trailOpacity: 0.13,
    phaseOffset: 12,
  },
  {
    id: "meo-relay",
    label: "MEO relay shell",
    orbitRadius: 3.14,
    inclination: 24,
    azimuth: -78,
    count: 16,
    type: "meo",
    speed: 0.23,
    spin: 0.42,
    sizeRange: [0.052, 0.071],
    color: "#c4b5fd",
    trailColor: 0xc4b5fd,
    trailOpacity: 0.12,
    phaseOffset: 34,
  },
  {
    id: "geo-belt",
    label: "GEO broadcast belt",
    orbitRadius: 4.18,
    inclination: 1.2,
    azimuth: -8,
    count: 16,
    type: "geo",
    speed: 0.075,
    spin: 0.24,
    sizeRange: [0.062, 0.086],
    color: "#fcd34d",
    trailColor: 0xf59e0b,
    trailOpacity: 0.12,
    phaseOffset: 3,
  },
];

export const CONSTELLATION_SATELLITE_COUNT = ORBIT_SHELLS.reduce(
  (total, shell) => total + shell.count,
  0,
);

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function jitter(random, amount) {
  return (random() * 2 - 1) * amount;
}

function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Build deterministic, slightly staggered satellite constellation data for
 * EarthGlobe. The returned shells total 99 procedural satellites; the ISS glTF
 * model rendered beside them brings the globe scene to roughly 100 satellites.
 */
export function generateConstellationOrbits({ seed = DEFAULT_SEED } = {}) {
  const random = createSeededRandom(seed);

  return ORBIT_SHELLS.map((shell) => {
    const spacing = 360 / shell.count;
    const satellites = Array.from({ length: shell.count }, (_, index) => {
      const size =
        shell.sizeRange[0] +
        (shell.sizeRange[1] - shell.sizeRange[0]) * random();
      const speed = shell.speed * (0.92 + random() * 0.16);
      const spin = shell.spin * (0.82 + random() * 0.36);
      const angle =
        shell.phaseOffset + index * spacing + jitter(random, spacing * 0.24);

      return {
        id: `${shell.id}-${String(index + 1).padStart(2, "0")}`,
        angle: round((angle + 360) % 360, 3),
        type: shell.type,
        speed: round(speed),
        color: shell.color,
        size: round(size),
        spin: round(spin),
        roll: round(random() * 360, 3),
      };
    });

    return {
      id: shell.id,
      label: shell.label,
      orbitRadius: shell.orbitRadius,
      inclination: shell.inclination,
      azimuth: shell.azimuth,
      trailColor: shell.trailColor,
      trailOpacity: shell.trailOpacity,
      satellites,
    };
  });
}
