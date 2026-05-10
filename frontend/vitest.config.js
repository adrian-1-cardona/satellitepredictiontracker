import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Resolve the real GLTFLoader module so tests can `vi.mock` this alias path
// when they need to substitute a stub. By default, the alias still points
// at the real module, so unmocked tests behave like production.
const gltfLoaderPath = fileURLToPath(
  new URL(
    "./node_modules/three/examples/jsm/loaders/GLTFLoader.js",
    import.meta.url,
  ),
);

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: {
        "three/examples/jsm/loaders/GLTFLoader.js": gltfLoaderPath,
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./vitest.setup.js"],
      globals: true,
      css: true,
      include: ["src/**/*.{test,spec}.{js,jsx}"],
    },
  }),
);
