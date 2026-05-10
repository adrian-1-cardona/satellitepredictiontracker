import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/**
 * Load an HDRI (High Dynamic Range Image) and apply it as an environment map
 * for realistic lighting and as a background for the scene.
 *
 * @param {THREE} THREE - The Three.js library object
 * @param {THREE.Scene} scene - The scene to apply the HDRI to
 * @param {string} hdriUrl - URL to the HDRI file (.hdr)
 * @param {number} intensity - Environment map intensity (default 1.0)
 * @returns {Promise<THREE.Texture>} The loaded HDRI texture
 */
export async function loadHDRIEnvironment(THREE, scene, hdriUrl, intensity = 1.0) {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    loader.load(
      hdriUrl,
      (texture) => {
        // Apply to scene background for the skybox effect
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;

        // Set environment intensity
        scene.backgroundIntensity = intensity;
        scene.environmentIntensity = intensity;

        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load HDRI from ${hdriUrl}:`, error);
        reject(error);
      },
    );
  });
}

/**
 * Fallback solid color background when HDRI fails to load.
 * Creates a procedural starfield effect using points.
 *
 * @param {THREE} THREE - The Three.js library object
 * @param {THREE.Scene} scene - The scene to add stars to
 * @param {number} starCount - Number of stars to generate
 */
export function createProceduralStarfield(THREE, scene, starCount = 2000) {
  // Solid space background color
  scene.background = new THREE.Color(0x000000);
  scene.backgroundIntensity = 1.0;

  // Create starfield geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  const starColorTemperatures = [
    [1.0, 1.0, 1.0],      // White
    [1.0, 0.95, 0.85],    // Warm
    [0.85, 0.95, 1.0],    // Cool
    [1.0, 0.8, 0.6],      // Orange
  ];

  for (let i = 0; i < starCount; i++) {
    const idx = i * 3;

    // Random position on a sphere (far distance)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 500;

    positions[idx] = radius * Math.sin(phi) * Math.cos(theta);
    positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = radius * Math.cos(phi);

    // Random color based on temperature
    const colorTemp =
      starColorTemperatures[Math.floor(Math.random() * starColorTemperatures.length)];
    colors[idx] = colorTemp[0];
    colors[idx + 1] = colorTemp[1];
    colors[idx + 2] = colorTemp[2];
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    sRGBColorSpace: true,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);

  return { stars, geometry, material };
}

/**
 * Dispose HDRI and starfield resources cleanly
 *
 * @param {THREE.Texture} hdriTexture - HDRI texture to dispose
 * @param {Object} starfield - Starfield object with geometry/material/points
 */
export function disposeEnvironment(hdriTexture, starfield) {
  if (hdriTexture) {
    hdriTexture.dispose();
  }
  if (starfield) {
    if (starfield.geometry) starfield.geometry.dispose();
    if (starfield.material) starfield.material.dispose();
    if (starfield.stars) starfield.stars.removeFromParent();
  }
}
