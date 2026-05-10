import { useCallback } from "react";
import { useThreeScene } from "../../hooks/useThreeScene.js";
import SceneContainer from "./SceneContainer.jsx";

/**
 * Photorealistic textured Earth with an orbiting satellite and soft atmosphere.
 * Used as the hero visual on the landing page.
 */
export default function EarthGlobe({ className = "" }) {
  const setupScene = useCallback(({ THREE, camera, prefersReducedMotion, scene }) => {
    camera.position.set(0, 0.2, 4.3);

    // ----- Earth
    const loader = new THREE.TextureLoader();
    const diffuse = loader.load("/textures/earth_atmos.jpg");
    const specular = loader.load("/textures/earth_specular.jpg");
    diffuse.colorSpace = THREE.SRGBColorSpace;

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 96, 96),
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

    // ----- Satellite (compact mesh)
    const satellite = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 }),
    );
    satellite.add(body);

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      emissive: 0x063b36,
      metalness: 0.4,
      roughness: 0.5,
    });
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.12), panelMaterial);
    leftPanel.position.x = -0.22;
    satellite.add(leftPanel);

    const rightPanel = leftPanel.clone();
    rightPanel.position.x = 0.22;
    satellite.add(rightPanel);

    const dish = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.09, 20, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x3a2100,
        side: THREE.DoubleSide,
      }),
    );
    dish.position.set(0, 0, 0.08);
    dish.rotation.x = Math.PI / 2;
    satellite.add(dish);

    const orbit = new THREE.Group();
    orbit.rotation.x = THREE.MathUtils.degToRad(26);
    orbit.rotation.z = THREE.MathUtils.degToRad(-12);
    orbit.add(satellite);
    scene.add(orbit);

    const orbitRadius = 2.05;
    satellite.position.set(orbitRadius, 0, 0);

    // Orbit trail ring (subtle)
    const trailGeometry = new THREE.TorusGeometry(orbitRadius, 0.003, 8, 128);
    const trail = new THREE.Mesh(
      trailGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x8edcff,
        transparent: true,
        opacity: 0.22,
      }),
    );
    trail.rotation.x = Math.PI / 2;
    orbit.add(trail);

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
        earth.rotation.y += delta * earthSpeed;
        orbit.rotation.y += delta * orbitSpeed;
        satellite.rotation.y += delta * 0.6;
      },
    };
  }, []);

  const containerRef = useThreeScene(setupScene, { cameraPosition: [0, 0.2, 4.3] });

  return (
    <SceneContainer className={`earth-globe-scene ${className}`.trim()}>
      <div ref={containerRef} className="three-scene-fill" />
    </SceneContainer>
  );
}
