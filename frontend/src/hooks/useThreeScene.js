import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_CAMERA_POSITION = [0, 0, 8];

function disposeMaterial(material) {
  if (!material) {
    return;
  }

  Object.values(material).forEach((value) => {
    if (value?.isTexture) {
      value.dispose();
    }
  });
  material.dispose?.();
}

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(child.material);
    }
  });
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

export function useThreeScene(setupScene, options = {}) {
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const stableSetup = useCallback(setupScene, [setupScene]);
  const [cameraX, cameraY, cameraZ] =
    options.cameraPosition || DEFAULT_CAMERA_POSITION;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(cameraX, cameraY, cameraZ);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = "three-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.tabIndex = -1;
    container.appendChild(renderer.domElement);

    let frameId = null;
    let disposed = false;
    let lastTime = window.performance.now();
    const startTime = lastTime;

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const sceneController =
      stableSetup?.({
        THREE,
        camera,
        container,
        prefersReducedMotion,
        renderer,
        scene,
      }) || {};

    function renderFrame() {
      if (disposed) {
        return;
      }

      const currentTime = window.performance.now();
      const delta = (currentTime - lastTime) / 1000;
      const elapsed = (currentTime - startTime) / 1000;
      lastTime = currentTime;
      sceneController.animate?.({ delta, elapsed, prefersReducedMotion });
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    }

    renderFrame();

    return () => {
      disposed = true;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
      sceneController.cleanup?.();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [cameraX, cameraY, cameraZ, prefersReducedMotion, stableSetup]);

  return containerRef;
}
