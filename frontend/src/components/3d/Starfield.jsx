import { useCallback } from "react";
import { useThreeScene } from "../../hooks/useThreeScene.js";
import SceneContainer from "./SceneContainer.jsx";

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

export default function Starfield({ className = "", densityVariant = "normal" }) {
  const setupScene = useCallback(
    ({ THREE, camera, container, prefersReducedMotion, scene }) => {
      const mobile = container.clientWidth < 700;
      const densityMap = {
        sparse: mobile ? 140 : 220,
        normal: mobile ? 220 : 430,
        dense: mobile ? 300 : 620,
      };
      const count = prefersReducedMotion
        ? Math.round((densityMap[densityVariant] || densityMap.normal) * 0.6)
        : densityMap[densityVariant] || densityMap.normal;

      camera.position.z = 1;

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const color = new THREE.Color();

      for (let index = 0; index < count; index += 1) {
        const radius = randomInRange(9, 34);
        const theta = randomInRange(0, Math.PI * 2);
        const phi = Math.acos(randomInRange(-1, 1));
        const positionIndex = index * 3;

        positions[positionIndex] = radius * Math.sin(phi) * Math.cos(theta);
        positions[positionIndex + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[positionIndex + 2] = radius * Math.cos(phi);

        color.setHSL(randomInRange(0.48, 0.62), randomInRange(0.15, 0.55), randomInRange(0.72, 1));
        colors[positionIndex] = color.r;
        colors[positionIndex + 1] = color.g;
        colors[positionIndex + 2] = color.b;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        opacity: 0.86,
        size: mobile ? 0.045 : 0.055,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });

      const stars = new THREE.Points(geometry, material);
      stars.rotation.x = -0.16;
      scene.add(stars);

      return {
        animate: ({ delta }) => {
          const drift = prefersReducedMotion ? 0.004 : 0.014;
          stars.rotation.y += delta * drift;
          stars.rotation.x += delta * drift * 0.16;
        },
      };
    },
    [densityVariant],
  );

  const containerRef = useThreeScene(setupScene, { cameraPosition: [0, 0, 1] });

  return (
    <SceneContainer className={`starfield-scene ${className}`.trim()}>
      <div ref={containerRef} className="three-scene-fill" />
    </SceneContainer>
  );
}
