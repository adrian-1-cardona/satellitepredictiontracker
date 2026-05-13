import { useCallback, useRef } from "react";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useThreeScene } from "../../hooks/useThreeScene.js";
import { generateConstellationOrbits } from "./constellationData.js";
import { createSatelliteGeometry } from "./SatelliteGeometry.js";
import { scaleEarthGlobeSatelliteToEarth } from "./satelliteScale.js";
import SceneContainer from "./SceneContainer.jsx";

const EARTH_RADIUS = 1.4;
const CAMERA_POSITION = [0, 0.3, 9.2];
const ISS_ORBIT_RADIUS = 2.05;
const ISS_INCLINATION_DEGREES = 26;
const ISS_AZIMUTH_DEGREES = -12;
const ISS_TARGET_RATIO = 0.145;
const EARTH_TEXTURE_LODS = [
  { id: "4k", maxAltitude: 4.8, url: "/textures/earth/earth-4k.jpg" },
  { id: "2k", maxAltitude: 8.2, url: "/textures/earth/earth-2k.jpg" },
  { id: "1k", maxAltitude: Number.POSITIVE_INFINITY, url: "/textures/earth/earth-1k.jpg" },
];

// ⚠️ CRITICAL: Satellite animation speeds are DRAMATICALLY SLOWED for visual inspection.
// These are NOT realistic speeds. Backend predictions remain accurate; this is UI visualization speed only.
// Rationale: Allows users to visually observe orbital patterns without waiting hours.
//
// Visualization targets:
// - ISS: 5-10 seconds per orbit (realistic: ~90 minutes)
// - LEO satellites: 10-20 seconds per orbit
// - MEO satellites: 30-60 seconds per orbit
// - GEO satellites: Nearly stationary (background only)
//
// Reduced by ~12x from realistic speeds to allow human observation.
const CONSTELLATION_BASE_SPEED = 0.06; // Slowed from 0.72
const CONSTELLATION_REDUCED_BASE_SPEED = 0.015; // Slowed from 0.18

/**
 * Walk an Object3D tree and dispose geometries, materials, and any textures
 * referenced by those materials. Used only for the post-unmount path in
 * `GLTFLoader.load`'s `onLoad` callback: if the scene has already been torn
 * down by `useThreeScene`, we dispose the freshly-parsed glTF scene here so it
 * does not leak GPU resources. For the normal flow, `useThreeScene` disposes
 * the whole scene graph automatically when the component unmounts.
 */
function disposeObjectTree(object) {
  if (!object) return;
  const disposeMaterial = (material) => {
    if (!material) return;
    Object.values(material).forEach((value) => {
      if (value?.isTexture) value.dispose();
    });
    material.dispose?.();
  };
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(child.material);
    }
  });
}

function sanitizeModelMaterials(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      if (material.emissive?.setHex) material.emissive.setHex(0x000000);
      if ("emissiveIntensity" in material) material.emissiveIntensity = 0;
      if ("toneMapped" in material) material.toneMapped = true;
      material.needsUpdate = true;
    });
  });
}

function loadColorTexture(THREE, textureLoader, url) {
  const texture = textureLoader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function selectEarthTextureLod(camera, earthRadius) {
  const altitude = Math.max(0, camera.position.length() - earthRadius);
  return EARTH_TEXTURE_LODS.find((lod) => altitude <= lod.maxAltitude) ||
    EARTH_TEXTURE_LODS[EARTH_TEXTURE_LODS.length - 1];
}

function createScaledProceduralSatellite(THREE, earthRadius, satelliteConfig) {
  const satelliteModel = createSatelliteGeometry(
    satelliteConfig.type,
    THREE,
    { accentColor: satelliteConfig.color },
  );
  const scale = scaleEarthGlobeSatelliteToEarth(
    satelliteModel.userData.longestSide,
    earthRadius,
    satelliteConfig.size,
  );
  if (scale <= 0) {
    disposeObjectTree(satelliteModel);
    return null;
  }
  satelliteModel.scale.setScalar(scale);
  return satelliteModel;
}

function attachLoadedModel({ THREE, model, earthRadius, targetRatio }) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const longestSide = Math.max(size.x, size.y, size.z);
  const scale = scaleEarthGlobeSatelliteToEarth(
    longestSide,
    earthRadius,
    targetRatio,
  );
  if (scale <= 0) return false;
  sanitizeModelMaterials(model);
  model.position.sub(center);
  model.scale.setScalar(scale);
  return true;
}

function createOrbitTrail(
  THREE,
  {
    radius,
    color = 0x00b4d8,
    opacity = 0.12,
    tubeRadius = 0.0024,
    radialSegments = 6,
    tubularSegments = 192,
  },
) {
  const trail = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tubeRadius, radialSegments, tubularSegments),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  trail.name = "OrbitTrail";
  trail.rotation.x = Math.PI / 2;
  return trail;
}

function positionSatelliteOnOrbit(wrapper, orbitRadius, angle, roll = 0) {
  wrapper.position.set(
    Math.cos(angle) * orbitRadius,
    0,
    Math.sin(angle) * orbitRadius,
  );
  wrapper.lookAt(0, 0, 0);
  wrapper.rotateZ(roll);
}

/**
 * Photorealistic textured Earth with an orbiting glTF satellite (ISS) and soft
 * atmosphere. Used as the hero visual on the landing page.
 *
 * Props:
 *   - className: optional extra class for the container.
 *   - modelUrl: URL of the glTF/GLB model to load as the orbiting satellite.
 *     Defaults to `/models/iss.glb`.
 *   - onModelLoaded: optional callback fired after the model has been scaled
 *     and attached to the orbit group. Exposed primarily for tests.
 */
export default function EarthGlobe({
  className = "",
  modelUrl = "/models/iss.glb",
  onModelLoaded,
}) {
  // Tracks whether the scene has been torn down. A fresh object is minted each
  // setup so the previous closure's flag stays frozen and truthful.
  const disposedFlagRef = useRef({ disposed: false });

  const setupScene = useCallback(
    ({ THREE, camera, prefersReducedMotion, renderer, scene }) => {
      try {
        disposedFlagRef.current = { disposed: false };
        const disposedFlag = disposedFlagRef.current;

        camera.position.set(...CAMERA_POSITION);
        camera.lookAt(0, 0, 0);
        scene.background = null;
        renderer?.setClearColor?.(0x000000, 0);

        // ----- Earth
        const textureLoader = new THREE.TextureLoader();
        const textureCache = new Map();
        let currentTextureLod = selectEarthTextureLod(camera, EARTH_RADIUS);
        textureCache.set(
          currentTextureLod.id,
          loadColorTexture(THREE, textureLoader, currentTextureLod.url),
        );
        const specular = textureLoader.load("/textures/earth_specular.jpg");

        const earthRadius = EARTH_RADIUS;
        const earth = new THREE.Mesh(
          new THREE.SphereGeometry(earthRadius, 96, 96),
          new THREE.MeshPhongMaterial({
            map: textureCache.get(currentTextureLod.id),
            specularMap: specular,
            specular: new THREE.Color(0x333333),
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
            shininess: 18,
          }),
        );
        earth.rotation.y = -1.2;
        scene.add(earth);

        // Atmosphere shader intentionally omitted; Earth remains crisp without
        // luminous post-processing or halo materials.

        // ----- ISS orbit group (inclined, carries the glTF and trail ring)
        const orbitRadius = ISS_ORBIT_RADIUS;
        const orbit = new THREE.Group();
        orbit.name = "ISSOrbit";
        orbit.rotation.x = THREE.MathUtils.degToRad(ISS_INCLINATION_DEGREES);
        orbit.rotation.z = THREE.MathUtils.degToRad(ISS_AZIMUTH_DEGREES);
        scene.add(orbit);

        // Orbit trail ring (subtle, present even if the glTF model never loads)
        orbit.add(
          createOrbitTrail(THREE, {
            radius: orbitRadius,
            color: 0x00b4d8,
            opacity: 0.14,
            tubeRadius: 0.003,
            radialSegments: 8,
            tubularSegments: 128,
          }),
        );

        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco/");
        loader.setDRACOLoader?.(dracoLoader);

        // ----- Procedural satellite constellation
        const constellationSatellites = [];
        const constellationRoot = new THREE.Group();
        constellationRoot.name = "EarthSatelliteConstellation";
        scene.add(constellationRoot);

        generateConstellationOrbits().forEach((orbitConfig) => {
          const orbitPlane = new THREE.Group();
          orbitPlane.name = `ConstellationOrbit:${orbitConfig.id}`;
          orbitPlane.rotation.x = THREE.MathUtils.degToRad(
            orbitConfig.inclination,
          );
          orbitPlane.rotation.z = THREE.MathUtils.degToRad(orbitConfig.azimuth);
          orbitPlane.userData = {
            ...orbitPlane.userData,
            orbitRadius: orbitConfig.orbitRadius,
            satelliteCount: orbitConfig.satellites.length,
          };
          orbitPlane.add(
            createOrbitTrail(THREE, {
              radius: orbitConfig.orbitRadius,
              color: orbitConfig.trailColor,
              opacity: orbitConfig.trailOpacity,
            }),
          );

          orbitConfig.satellites.forEach((satelliteConfig) => {
            const satelliteWrapper = new THREE.Group();
            satelliteWrapper.name = `ConstellationSatellite:${satelliteConfig.id}`;
            const angle = THREE.MathUtils.degToRad(satelliteConfig.angle);
            const roll = THREE.MathUtils.degToRad(satelliteConfig.roll);

            const fallbackModel = createScaledProceduralSatellite(
              THREE,
              earthRadius,
              satelliteConfig,
            );
            if (!fallbackModel) return;

            let activeModel = fallbackModel;
            satelliteWrapper.add(fallbackModel);
            positionSatelliteOnOrbit(
              satelliteWrapper,
              orbitConfig.orbitRadius,
              angle,
              roll,
            );
            orbitPlane.add(satelliteWrapper);
            constellationSatellites.push({
              wrapper: satelliteWrapper,
              get model() {
                return activeModel;
              },
              orbitRadius: orbitConfig.orbitRadius,
              angle,
              roll,
              speed: satelliteConfig.speed,
              spin: satelliteConfig.spin,
              phase: angle,
            });

            if (satelliteConfig.modelUrl) {
              loader.load(
                satelliteConfig.modelUrl,
                (gltf) => {
                  if (disposedFlag.disposed) {
                    disposeObjectTree(gltf.scene);
                    return;
                  }
                  try {
                    const attached = attachLoadedModel({
                      THREE,
                      model: gltf.scene,
                      earthRadius,
                      targetRatio: satelliteConfig.size,
                    });
                    if (!attached) {
                      disposeObjectTree(gltf.scene);
                      return;
                    }
                    satelliteWrapper.remove(fallbackModel);
                    disposeObjectTree(fallbackModel);
                    satelliteWrapper.add(gltf.scene);
                    activeModel = gltf.scene;
                  } catch (err) {
                    disposeObjectTree(gltf.scene);
                    console.warn(
                      `${satelliteConfig.name || satelliteConfig.id} model attach failed; using procedural fallback`,
                      err,
                    );
                  }
                },
                undefined,
                (err) => {
                  console.warn(
                    `${satelliteConfig.name || satelliteConfig.id} model load failed; using procedural fallback`,
                    err,
                  );
                },
              );
            }
          });

          constellationRoot.add(orbitPlane);
        });

        const issFallback = createScaledProceduralSatellite(THREE, earthRadius, {
          type: "leo",
          color: "#00b4d8",
          size: ISS_TARGET_RATIO,
        });
        const satelliteWrapper = new THREE.Group();
        satelliteWrapper.name = "ISSSatelliteWrapper";
        satelliteWrapper.position.set(orbitRadius, 0, 0);
        if (issFallback) satelliteWrapper.add(issFallback);
        orbit.add(satelliteWrapper);

        // ----- Satellite model (async glTF load)
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposedFlag.disposed) {
              // The effect already cleaned up. Dispose the freshly-parsed
              // scene ourselves to avoid leaking GPU resources.
              disposeObjectTree(gltf.scene);
              return;
            }
            try {
              const attached = attachLoadedModel({
                THREE,
                model: gltf.scene,
                earthRadius,
                targetRatio: ISS_TARGET_RATIO,
              });
              if (!attached) {
                disposeObjectTree(gltf.scene);
                return;
              }

              // Keep the ISS model as a solid PBR asset without halo materials.
              if (issFallback) {
                satelliteWrapper.remove(issFallback);
                disposeObjectTree(issFallback);
              }
              satelliteWrapper.add(gltf.scene);
              onModelLoaded?.(gltf.scene);
            } catch (err) {
              disposeObjectTree(gltf.scene);
              console.warn(
                "ISS model attach failed; using procedural fallback",
                err,
              );
            }
          },
          undefined,
          (err) => {
            console.warn(
              "ISS model load failed; using procedural fallback",
              err,
            );
          },
        );

        // ----- Lighting
        scene.add(new THREE.AmbientLight(0x3b4b6b, 0.9));

        const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
        sun.position.set(5, 2.5, 4);
        scene.add(sun);

        const fill = new THREE.PointLight(0x5fbdff, 0.9, 20);
        fill.position.set(-4, -1, -3);
        scene.add(fill);

        return {
          animate: ({ delta }) => {
            // ⚠️ SLOWED SPEEDS: All orbital speeds reduced ~12x for visual inspection.
            // Users can observe orbital patterns within seconds instead of hours.
            // Backend predictions remain accurate; this is UI visualization speed only.
            const nextTextureLod = selectEarthTextureLod(camera, earthRadius);
            if (nextTextureLod.id !== currentTextureLod.id) {
              if (!textureCache.has(nextTextureLod.id)) {
                textureCache.set(
                  nextTextureLod.id,
                  loadColorTexture(THREE, textureLoader, nextTextureLod.url),
                );
              }
              earth.material.map = textureCache.get(nextTextureLod.id);
              earth.material.needsUpdate = true;
              currentTextureLod = nextTextureLod;
            }

            const earthSpeed = prefersReducedMotion ? 0.002 : 0.005; // Slowed from 0.02/0.055
            const orbitSpeed = prefersReducedMotion ? 0.007 : 0.027; // ISS: Slowed from 0.08/0.32 (~5-10s per orbit)
            const constellationBaseSpeed = prefersReducedMotion
              ? CONSTELLATION_REDUCED_BASE_SPEED
              : CONSTELLATION_BASE_SPEED;
            const selfSpinSpeed = prefersReducedMotion ? 0.013 : 0.045; // Slowed from 0.16/0.54
            earth.rotation.y += delta * earthSpeed;
            orbit.rotation.y += delta * orbitSpeed;
            constellationSatellites.forEach((satellite) => {
              satellite.angle +=
                delta * constellationBaseSpeed * satellite.speed;
              positionSatelliteOnOrbit(
                satellite.wrapper,
                satellite.orbitRadius,
                satellite.angle,
                satellite.roll,
              );
              satellite.model.rotation.y +=
                delta * selfSpinSpeed * satellite.spin;
              satellite.model.rotation.x =
                Math.sin(satellite.angle + satellite.phase) * 0.035;
            });
            if (satelliteWrapper) {
              satelliteWrapper.rotation.y += delta * 0.05; // Slowed from 0.6
            }
          },
          cleanup: () => {
            disposedFlag.disposed = true;
            dracoLoader.dispose();
            textureCache.forEach((texture) => {
              if (texture !== earth.material.map) texture.dispose();
            });
          },
        };
      } catch (err) {
        console.warn("EarthGlobe setupScene failed", err);
        return {};
      }
    },
    [modelUrl, onModelLoaded],
  );

  const containerRef = useThreeScene(setupScene, {
    cameraPosition: CAMERA_POSITION,
  });

  return (
    <SceneContainer className={`earth-globe-scene ${className}`.trim()}>
      <div ref={containerRef} className="three-scene-fill" />
    </SceneContainer>
  );
}
