import { useCallback, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useThreeScene } from "../../hooks/useThreeScene.js";
import { generateConstellationOrbits } from "./constellationData.js";
import { createSatelliteGeometry } from "./SatelliteGeometry.js";
import { scaleEarthGlobeSatelliteToEarth } from "./satelliteScale.js";
import SceneContainer from "./SceneContainer.jsx";

const EARTH_RADIUS = 1.4;
const CAMERA_POSITION = [0, 0.2, 7.4];
const ISS_ORBIT_RADIUS = 2.05;
const ISS_INCLINATION_DEGREES = 26;
const ISS_AZIMUTH_DEGREES = -12;
const ISS_TARGET_RATIO = 0.145;
const CONSTELLATION_BASE_SPEED = 0.72;
const CONSTELLATION_REDUCED_BASE_SPEED = 0.18;

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

function createOrbitTrail(
  THREE,
  {
    radius,
    color = 0x8edcff,
    opacity = 0.18,
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
    ({ THREE, camera, prefersReducedMotion, scene }) => {
      try {
        disposedFlagRef.current = { disposed: false };
        const disposedFlag = disposedFlagRef.current;

        camera.position.set(...CAMERA_POSITION);
        camera.lookAt(0, 0, 0);

        // ----- Earth
        const textureLoader = new THREE.TextureLoader();
        const diffuse = textureLoader.load("/textures/earth_atmos.jpg");
        const specular = textureLoader.load("/textures/earth_specular.jpg");
        diffuse.colorSpace = THREE.SRGBColorSpace;

        const earthRadius = EARTH_RADIUS;
        const earth = new THREE.Mesh(
          new THREE.SphereGeometry(earthRadius, 96, 96),
          new THREE.MeshPhongMaterial({
            map: diffuse,
            specularMap: specular,
            specular: new THREE.Color(0x333333),
            shininess: 18,
          }),
        );
        earth.rotation.y = -1.2;
        scene.add(earth);

        // ----- Atmosphere glow
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.46, 64, 64),
          new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.BackSide,
            uniforms: {},
            vertexShader: /* glsl */ `
              varying vec3 vNormal;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: /* glsl */ `
              varying vec3 vNormal;
              void main() {
                float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
                gl_FragColor = vec4(0.36, 0.72, 1.0, 1.0) * intensity;
              }
            `,
          }),
        );
        scene.add(atmosphere);

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
            color: 0x8edcff,
            opacity: 0.22,
            tubeRadius: 0.003,
            radialSegments: 8,
            tubularSegments: 128,
          }),
        );

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
            if (scale <= 0) return;

            const angle = THREE.MathUtils.degToRad(satelliteConfig.angle);
            const roll = THREE.MathUtils.degToRad(satelliteConfig.roll);
            satelliteModel.scale.setScalar(scale);
            satelliteWrapper.add(satelliteModel);
            positionSatelliteOnOrbit(
              satelliteWrapper,
              orbitConfig.orbitRadius,
              angle,
              roll,
            );
            orbitPlane.add(satelliteWrapper);
            constellationSatellites.push({
              wrapper: satelliteWrapper,
              model: satelliteModel,
              orbitRadius: orbitConfig.orbitRadius,
              angle,
              roll,
              speed: satelliteConfig.speed,
              spin: satelliteConfig.spin,
              phase: angle,
            });
          });

          constellationRoot.add(orbitPlane);
        });

        // Created only after the glTF successfully loads. On load failure the
        // orbit group intentionally keeps only the trail torus.
        let satelliteWrapper = null;

        // ----- Satellite model (async glTF load)
        const loader = new GLTFLoader();
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
              const box = new THREE.Box3().setFromObject(gltf.scene);
              const size = box.getSize(new THREE.Vector3());
              const longestSide = Math.max(size.x, size.y, size.z);
              const scale = scaleEarthGlobeSatelliteToEarth(
                longestSide,
                earthRadius,
                ISS_TARGET_RATIO,
              );
              if (scale <= 0) {
                disposeObjectTree(gltf.scene);
                return;
              }
              gltf.scene.scale.setScalar(scale);
              gltf.scene.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });

              satelliteWrapper = new THREE.Group();
              satelliteWrapper.name = "ISSSatelliteWrapper";
              satelliteWrapper.position.set(orbitRadius, 0, 0);
              const issGlow = new THREE.Mesh(
                new THREE.SphereGeometry(earthRadius * 0.095, 24, 16),
                new THREE.MeshBasicMaterial({
                  color: 0x7dd3fc,
                  transparent: true,
                  opacity: 0.18,
                  blending: THREE.AdditiveBlending,
                  depthWrite: false,
                }),
              );
              issGlow.name = "ISSSubtleGlow";
              satelliteWrapper.add(issGlow);
              satelliteWrapper.add(gltf.scene);
              orbit.add(satelliteWrapper);
              onModelLoaded?.(gltf.scene);
            } catch (err) {
              console.warn(
                "ISS model attach failed, rendering without satellite",
                err,
              );
            }
          },
          undefined,
          (err) => {
            console.warn(
              "ISS model load failed, rendering without satellite",
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
            const earthSpeed = prefersReducedMotion ? 0.02 : 0.055;
            const orbitSpeed = prefersReducedMotion ? 0.08 : 0.32;
            const constellationBaseSpeed = prefersReducedMotion
              ? CONSTELLATION_REDUCED_BASE_SPEED
              : CONSTELLATION_BASE_SPEED;
            const selfSpinSpeed = prefersReducedMotion ? 0.16 : 0.54;
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
              satelliteWrapper.rotation.y += delta * 0.6;
            }
          },
          cleanup: () => {
            disposedFlag.disposed = true;
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
