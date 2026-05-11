import { useCallback } from "react";
import { useThreeScene } from "../../hooks/useThreeScene.js";
import SceneContainer from "./SceneContainer.jsx";

function createPanel(THREE, x) {
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.08, 0.82),
    new THREE.MeshStandardMaterial({
      color: 0x1f4f67,
      emissive: 0x000000,
      emissiveIntensity: 0,
      metalness: 0.38,
      roughness: 0.42,
    }),
  );
  panel.position.x = x;
  return panel;
}

export default function Satellite({ className = "", compact = false }) {
  const setupScene = useCallback(
    ({ THREE, camera, prefersReducedMotion, scene }) => {
      camera.position.set(0, compact ? 0.1 : 0, compact ? 7.8 : 6.4);

      const group = new THREE.Group();
      group.rotation.set(-0.22, 0.62, -0.08);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.08, 0.78, 0.92),
        new THREE.MeshStandardMaterial({
          color: 0xe8edf4,
          emissive: 0x000000,
          emissiveIntensity: 0,
          metalness: 0.58,
          roughness: 0.24,
        }),
      );
      group.add(body);

      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.52, 0.98),
        new THREE.MeshStandardMaterial({
          color: 0x92a5b8,
          emissive: 0x000000,
          emissiveIntensity: 0,
          metalness: 0.72,
          roughness: 0.3,
        }),
      );
      group.add(core);

      const leftPanel = createPanel(THREE, -1.72);
      const rightPanel = createPanel(THREE, 1.72);
      group.add(leftPanel, rightPanel);

      const panelLineMaterial = new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.5,
      });
      [-1.72, 1.72].forEach((x) => {
        [-0.23, 0.23].forEach((y) => {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x - 0.98, y, 0.43),
            new THREE.Vector3(x + 0.98, y, 0.43),
          ]);
          group.add(new THREE.Line(lineGeometry, panelLineMaterial));
        });
      });

      const dish = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.45, 32, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0x000000,
          emissiveIntensity: 0,
          metalness: 0.45,
          roughness: 0.36,
          side: THREE.DoubleSide,
        }),
      );
      dish.position.set(0, -0.07, 0.78);
      dish.rotation.x = Math.PI / 2;
      group.add(dish);

      const antennaMaterial = new THREE.LineBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.82,
      });
      const antennaGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.42, -0.48),
        new THREE.Vector3(0, 1.22, -1.24),
      ]);
      group.add(new THREE.Line(antennaGeometry, antennaMaterial));

      const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          emissive: 0x000000,
          emissiveIntensity: 0,
        }),
      );
      antennaTip.position.set(0, 1.22, -1.24);
      group.add(antennaTip);

      scene.add(group);
      scene.add(new THREE.AmbientLight(0x9ccfff, 1.55));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(4, 3, 5);
      scene.add(keyLight);

      return {
        animate: ({ delta, elapsed }) => {
          const speed = prefersReducedMotion ? 0.08 : 0.24;
          group.rotation.y += delta * speed;
          group.rotation.z = Math.sin(elapsed * 0.42) * 0.08 - 0.08;
          group.position.y = Math.sin(elapsed * 0.8) * (prefersReducedMotion ? 0.025 : 0.075);
        },
      };
    },
    [compact],
  );

  const containerRef = useThreeScene(setupScene, {
    cameraPosition: [0, 0, compact ? 7.8 : 6.4],
  });

  return (
    <SceneContainer className={`satellite-scene ${className}`.trim()}>
      <div ref={containerRef} className="three-scene-fill" />
    </SceneContainer>
  );
}
