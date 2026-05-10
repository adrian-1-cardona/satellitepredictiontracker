# Implementation Plan: Globe Hero UI

## Overview

This plan rebuilds the unauthenticated landing route (`/`) so that the 3D Earth and a realistic glTF satellite fill the viewport, auth controls live in the top-right, a health-probed status pill lives in the bottom-left, and an aerospace-flavoured typography system is applied site-wide. Every task targets `frontend/` only (the design forbids backend changes); the implementation language is **JavaScript (JSX)** matching the existing Vite + React 19 toolchain.

Tasks are ordered so pure helpers and test infrastructure land before the code that depends on them. Sub-tasks marked with `*` are optional (tests and nice-to-have optimisations) — the top-level parent tasks are always required. Each task that produces code ends with a `(satisfies …)` note linking it to the requirement(s) or property it covers.

Convention for the instructions below:

> Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Tasks

- [x] 1. Set up the frontend test toolchain
  - [x] 1.1 Add Vitest + Testing Library + fast-check + axe devDependencies
    - Update `frontend/package.json` to add `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `fast-check`, `jest-axe`, `resize-observer-polyfill` as `devDependencies`.
    - Add npm scripts: `"test": "vitest --run"`, `"test:watch": "vitest"`, `"test:ui": "vitest --ui"`.
    - Do not upgrade existing runtime dependencies.
    - _Files: `frontend/package.json`_
    - (satisfies prerequisite for Properties 1–8 and all unit tests)

  - [x] 1.2 Create `vitest.config.js`
    - Create `frontend/vitest.config.js` extending the Vite config, setting `test.environment = "jsdom"`, `test.setupFiles = ["./vitest.setup.js"]`, `test.globals = true`, and `test.css = true`.
    - Add a `resolve.alias` entry mapping `three/examples/jsm/loaders/GLTFLoader.js` so tests can substitute a stub (leave alias pointing at the real module by default; individual tests will `vi.mock` it when needed).
    - Configure `test.include = ["src/**/*.{test,spec}.{js,jsx}"]`.
    - _Files: `frontend/vitest.config.js`_
    - (satisfies prerequisite for all property/unit tests)

  - [x] 1.3 Create `vitest.setup.js`
    - Create `frontend/vitest.setup.js` that registers `@testing-library/jest-dom`, installs `resize-observer-polyfill` as `window.ResizeObserver`, stubs `matchMedia` for `prefers-reduced-motion`, and registers a `getBoundingClientRect` polyfill derived from inline styles for jsdom (used by Property 3).
    - Also install a `WebGLRenderingContext` no-op stub on `HTMLCanvasElement.prototype.getContext` so `three.js` initialises without crashing the suite.
    - _Files: `frontend/vitest.setup.js`_
    - (satisfies prerequisite for Properties 1, 3, 4, 6 and `EarthGlobe` unit tests)

  - [x] 1.4 Verify the test runner boots with a sanity spec
    - Add `frontend/src/__tests__/sanity.test.js` asserting `1 + 1 === 2` and `document` is defined.
    - Run `npm --prefix frontend run test` and confirm a green run.
    - Delete `sanity.test.js` once verified.
    - _Files: `frontend/src/__tests__/sanity.test.js` (temporary)_
    - (satisfies prerequisite for Properties 1–8)

- [x] 2. Integrate the professional typography system site-wide
  - [x] 2.1 Add Google Fonts links to `index.html`
    - Edit `frontend/index.html`:
      - Add `<link rel="preconnect" href="https://fonts.googleapis.com">`.
      - Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
      - Add `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap">`.
      - If missing, add `<meta name="theme-color" content="#05080f">`.
    - _Files: `frontend/index.html`_
    - (satisfies Req 5.2, 5.5, 5.6)

  - [x] 2.2 Introduce `--font-display` and `--font-body` CSS variables and apply site-wide
    - Edit `frontend/src/styles.css`:
      - Add to `:root`:
        ```css
        --font-display: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --font-body: "Inter Tight", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        ```
      - Replace the existing `font-family: Inter, ui-sans-serif, system-ui, …` declaration on `:root`/`body` with `font-family: var(--font-body);`.
      - Add/update the heading rule: `h1, h2, h3, h4, .brand-lockup, .eyebrow { font-family: var(--font-display); letter-spacing: -0.01em; }`.
      - Do not reintroduce `font-family: Inter` anywhere else.
    - _Files: `frontend/src/styles.css`_
    - (satisfies Req 5.1, 5.3, 5.4, 5.7)

- [x] 3. Source and ship the realistic satellite asset
  - [x] 3.1 Create `frontend/public/models/` and place the GLB
    - Download a public-domain ISS GLB (NASA 3D Resources / NASA "ISS Mimic" on GitHub) or an equivalent CC0 communication satellite as the fallback documented in the design.
    - Save the binary at `frontend/public/models/iss.glb` so it resolves as `/models/iss.glb` at runtime.
    - _Files: `frontend/public/models/iss.glb`_
    - (satisfies Req 4.1, 4.2; external dependency: one-time asset download)

  - [x] 3.2 Add `ATTRIBUTIONS.md` next to the model
    - Create `frontend/public/models/ATTRIBUTIONS.md` recording the asset name, source URL, license (public domain / CC-BY / CC0), and the exact attribution string required (e.g., "Image credit: NASA").
    - _Files: `frontend/public/models/ATTRIBUTIONS.md`_
    - (satisfies Req 4.2; supporting documentation)

  - [x] 3.3 Compress the GLB with gltfpack / gltf-transform
    - Run `npx gltfpack -i iss.glb -o iss.glb -c` (or `gltf-transform draco`) on the downloaded file to keep the payload ≤ 4 MB.
    - Re-commit the compressed file at `frontend/public/models/iss.glb`.
    - Optional: if compression degrades materials, skip this sub-task and keep the uncompressed asset.
    - _Files: `frontend/public/models/iss.glb`_
    - (nice-to-have optimization; satisfies Req 4.2 indirectly via payload size)

- [x] 4. Extract the pure `scaleModelToEarth` helper
  - [x] 4.1 Create the helper module
    - Create `frontend/src/components/3d/satelliteScale.js` exporting a pure function:
      ```js
      export function scaleModelToEarth(longestSide, earthRadius, target = 0.07) { … }
      ```
    - Given `longestSide > 0`, return a scale factor `s` such that `longestSide * s === target * 2 * earthRadius`, then clamp `s` so `(longestSide * s) / (2 * earthRadius)` stays in the closed interval `[0.03, 0.12]`.
    - Guard against zero / non-finite inputs by returning `0` (model skipped) rather than throwing.
    - No three.js imports — the module is pure arithmetic so it can be property-tested in isolation.
    - _Files: `frontend/src/components/3d/satelliteScale.js`_
    - (satisfies Req 4.5 / Property 5)

  - [x] 4.2 Write property test for `scaleModelToEarth`
    - Create `frontend/src/components/3d/__tests__/satellite-size.property.test.js`.
    - Use `fast-check` with `fc.float({ min: 0.001, max: 1000, noNaN: true, noDefaultInfinity: true })` as the longest-side generator, `fc.float({ min: 0.5, max: 10 })` for `earthRadius`.
    - Assert: `(longestSide * scaleModelToEarth(longestSide, earthRadius)) / (2 * earthRadius)` lies in `[0.03, 0.12]`.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - Add header comment: `// Feature: globe-hero-ui, Property 5: satellite scale is clamped to [3%, 12%] of earth diameter`.
    - _Files: `frontend/src/components/3d/__tests__/satellite-size.property.test.js`_
    - (satisfies Property 5 / Req 4.5)

- [x] 5. Extend `useThreeScene` with animation-tick error containment
  - [x] 5.1 Wrap the animate call in a try/catch and add a one-shot warn
    - Edit `frontend/src/hooks/useThreeScene.js`:
      - Inside the RAF render loop, wrap `sceneController.animate?.(…)` in `try { … } catch (err) { if (!animateFailedRef.current) { console.warn("Scene animate threw, disabling further animation", err); animateFailedRef.current = true; } sceneController.animate = null; }`.
      - Also wrap `renderer.render(scene, camera)` in its own try/catch so a WebGL error logs `console.warn` once and suspends further frames without crashing React.
      - Expose no new public props; this is a defensive internal change.
    - _Files: `frontend/src/hooks/useThreeScene.js`_
    - (satisfies Req 4.8 / Property 6)

- [x] 6. Extend `EarthGlobe` to load the glTF satellite
  - [x] 6.1 Replace the primitive satellite with `GLTFLoader`-driven model
    - Edit `frontend/src/components/3d/EarthGlobe.jsx`:
      - Add `modelUrl = "/models/iss.glb"` and optional `onModelLoaded` props.
      - Remove the primitive-mesh satellite construction (box body + box solar panels + cone dish).
      - Import `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`.
      - Inside `setupScene`, after the earth + atmosphere are added, instantiate a `GLTFLoader` and call `loader.load(modelUrl, onLoad, undefined, onError)`.
      - In `onLoad`: compute `new THREE.Box3().setFromObject(gltf.scene)`, take the longest side, call `scaleModelToEarth(longestSide, earthRadius)` and apply `gltf.scene.scale.setScalar(scale)`.
      - Traverse `gltf.scene` and set `castShadow = true`, `receiveShadow = true` on every `Mesh`. Keep the loaded PBR materials unchanged.
      - Parent `gltf.scene` to the existing `orbit` group, positioned at `(orbitRadius, 0, 0)` so the current inclined orbit (`rotation.x = deg2rad(26)`, `rotation.z = deg2rad(-12)`) and direction of travel are preserved.
      - Use a `disposedFlag` ref captured by the cleanup closure; if `onLoad` resolves after unmount, call the existing `disposeObject` walker on `gltf.scene` and return without mutating the scene.
      - In `onError`, `console.warn("ISS model load failed, rendering without satellite", err)` and leave `orbit` without the model child (trail torus still renders).
      - Wrap the entire `setupScene` body in try/catch; on throw emit a single `console.warn` and continue.
      - Fire `onModelLoaded?.(gltf.scene)` after successful attach (for tests).
    - _Files: `frontend/src/components/3d/EarthGlobe.jsx`_
    - (satisfies Req 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9 / Properties 4, 6)

  - [x] 6.2 Write property test for satellite orbital invariants
    - Create `frontend/src/components/3d/__tests__/orbit.property.test.jsx`.
    - Mock `GLTFLoader` so `load` synchronously calls `onLoad` with a stub `gltf.scene` of a known size.
    - Generate sample times with `fc.array(fc.float({ min: 0, max: 60, noNaN: true }), { minLength: 2, maxLength: 10 })`.
    - For each sample pair `t1 < t2`, step the scene animator, read the satellite's world position, assert `|p| ≈ 2.05 ± 0.02`, and assert the cross product `p(t1) × p(t2)` keeps a consistent sign along the orbit normal.
    - Assert `orbit.rotation.x === deg2rad(26)` and `orbit.rotation.z === deg2rad(-12)` throughout.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - _Files: `frontend/src/components/3d/__tests__/orbit.property.test.jsx`_
    - (satisfies Property 4 / Req 4.4)

  - [x] 6.3 Write property test for scene error containment
    - Create `frontend/src/components/3d/__tests__/scene-errors.property.test.jsx`.
    - Mock `GLTFLoader` and `TextureLoader` such that `.load` invokes the error callback with fast-check-generated errors (`fc.oneof(fc.constantFrom(new TypeError("x"), new Error("corrupt glb"), new DOMException("abort", "AbortError")), fc.string().map(m => new Error(m)))`).
    - Render `<EarthGlobe />`, await the next microtask, then unmount.
    - Assert: no `console.error` calls originating from component code, no `unhandledrejection` events on `window`, and `orbit.children` (excluding the trail torus) has length `0` when the loader failed.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - _Files: `frontend/src/components/3d/__tests__/scene-errors.property.test.jsx`_
    - (satisfies Property 6 / Req 4.7, 4.8)

  - [x] 6.4 Write example-based unit tests for `EarthGlobe`
    - Create `frontend/src/components/3d/__tests__/EarthGlobe.test.jsx`.
    - Mock `GLTFLoader` lightly; assert default `modelUrl` is `/models/iss.glb`; assert loaded group is added to `orbit`; assert no `Mesh` survives from the old primitive-box-body satellite.
    - With `matchMedia` mocked for `prefers-reduced-motion: reduce`, assert the reduced orbit and self-spin speeds are used.
    - _Files: `frontend/src/components/3d/__tests__/EarthGlobe.test.jsx`_
    - (satisfies Req 4.1, 4.6)

- [x] 7. Scaffold hero chrome components
  - [x] 7.1 Create `HeroStage`
    - Create `frontend/src/components/hero/HeroStage.jsx` rendering `<div className="hero-stage" aria-hidden="true">` containing `<Starfield className="hero-starfield" densityVariant="dense" />` and `<EarthGlobe className="hero-globe" />`.
    - Add CSS in a new `frontend/src/components/hero/HeroStage.css` (imported from the component) implementing the design's spec: `position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 1; pointer-events: none; overflow: hidden;` plus the nested canvas/scene `position: absolute; inset: 0;` rules.
    - _Files: `frontend/src/components/hero/HeroStage.jsx`, `frontend/src/components/hero/HeroStage.css`_
    - (satisfies Req 1.1, 1.4, 1.7, 8.2 / Property 1, 2)

  - [x] 7.2 Create `TopRightAuthBar`
    - Create `frontend/src/components/hero/TopRightAuthBar.jsx` exporting a component with props `{ onLogin: () => void, onSignup: () => void }`.
    - Render `<nav className="top-right-auth" aria-label="Account">` with two `<button>` elements: a ghost "Log In" (with `LogIn` lucide icon, `aria-hidden` on the icon) and an accent "Sign Up" (with `UserPlus` icon).
    - Ensure accessible names exactly `Log In` and `Sign Up`.
    - Add CSS in `frontend/src/components/hero/TopRightAuthBar.css` per the design (fixed top/right 24px, gap 10px, `max-width: calc((100vw - 48px) / 3)`, pill styling, focus ring, mobile stacked layout below 480px).
    - _Files: `frontend/src/components/hero/TopRightAuthBar.jsx`, `frontend/src/components/hero/TopRightAuthBar.css`_
    - (satisfies Req 2.1, 2.2, 2.5, 2.7, 2.8, 7.3 / Property 3)

  - [x] 7.3 Write unit test for `TopRightAuthBar`
    - Create `frontend/src/components/hero/__tests__/TopRightAuthBar.test.jsx`.
    - Assert computed styles at jsdom width 1280: `position: fixed`, `top: 24px`, `right: 24px`.
    - Query by role/name and assert `/log in/i` and `/sign up/i` buttons exist, each with `onClick` firing its respective callback.
    - _Files: `frontend/src/components/hero/__tests__/TopRightAuthBar.test.jsx`_
    - (satisfies Req 2.1, 2.2, 2.8)

  - [x] 7.4 Create `StatusIndicator`
    - Create `frontend/src/components/hero/StatusIndicator.jsx`:
      - Local state `status: "checking" | "online" | "offline"`, initial `"checking"`.
      - In a `useEffect`, instantiate an `AbortController`, call `api.head("/", { signal, timeout: 2500 })` (reusing the existing `api` axios instance from `frontend/src/api/client.js` — do not touch `client.js`). Any resolved response OR any `err.response` → `setStatus("online")`. Network-level error (`ECONNREFUSED`, `ERR_NETWORK`, `ETIMEDOUT`, `ENOTFOUND`) → `setStatus("offline")`. Ignore `AbortError` / `CanceledError`.
      - Re-poll every 30 seconds via `setInterval`; on cleanup, `abort()` the controller, clear the interval, and mark cancelled.
      - Render `<div className="status-indicator" role="status" aria-live="polite">` with label "Prediction service" (with `RadioTower` icon, `aria-hidden`) and a `<strong className={`status-value status-${status}`}>` carrying the human label (`Online` / `Offline` / `Checking…`).
    - Add CSS in `frontend/src/components/hero/StatusIndicator.css` per the design (fixed bottom/left 24px, `max-width: calc((100vw - 48px) / 3)`, mint/danger/muted color tokens).
    - _Files: `frontend/src/components/hero/StatusIndicator.jsx`, `frontend/src/components/hero/StatusIndicator.css`_
    - (satisfies Req 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.4, 8.6 / Property 3, 8)

  - [x] 7.5 Write unit test for `StatusIndicator`
    - Create `frontend/src/components/hero/__tests__/StatusIndicator.test.jsx`.
    - Mock `api.head` with `vi.mock("../../../api/client", …)`.
    - Case A: resolves `{ status: 200 }` → text becomes `/online/i`.
    - Case B: rejects with `{ code: "ERR_NETWORK" }` → text becomes `/offline/i`.
    - Case C: rejects with `{ response: { status: 500 } }` → text becomes `/online/i` (server reachable).
    - Assert `role="status"` + `aria-live="polite"` present.
    - Assert `AbortController.abort` is invoked on unmount (spy on `AbortController.prototype.abort`).
    - _Files: `frontend/src/components/hero/__tests__/StatusIndicator.test.jsx`_
    - (satisfies Req 3.1, 3.4, 3.5, 3.6, 8.6)

- [x] 8. Rewrite the landing page to mount the new hero
  - [x] 8.1 Replace `Landing.jsx` body with `GlobeHeroView`
    - Edit `frontend/src/pages/Landing.jsx`:
      - Remove the entire `.landing-hero` markup (eyebrow, headline, description, primary button group, signal readout).
      - Stop wrapping the page content in `AuthLayout`.
      - Render `<main className="globe-hero" aria-label="Satellite Tracker landing">` containing, in source order: `<TopRightAuthBar onLogin={…} onSignup={…} />`, `<StatusIndicator />`, `<HeroStage />`, then `<AuthModal open={authMode !== null} initialMode={authMode ?? "login"} onClose={() => setAuthMode(null)} />`.
      - Keep `authMode` state handling identical in shape to today.
      - Keep the existing `useAuth()` + `useNavigate()` wiring. Replace the current `Navigate` redirect with an imperative `useEffect` that calls `navigate("/dashboard", { replace: true })` inside a `try/catch`; on catch, `console.error(err)` and call `clearAuth()` (Req 6.4 rollback).
      - Do not import from `../auth/AuthLayout` anymore.
    - Add a `frontend/src/pages/Landing.css` (or extend `styles.css`) so `.globe-hero` has `min-height: 100vh; position: relative; overflow: hidden;` and does not introduce its own padding/grid.
    - _Files: `frontend/src/pages/Landing.jsx`, `frontend/src/pages/Landing.css` (or `frontend/src/styles.css` if preferred)_
    - (satisfies Req 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 8.1)

  - [x] 8.2 Remove the dead `.landing-hero` styles
    - Edit `frontend/src/styles.css` and delete the `.landing-hero`, `.landing-hero__copy`, `.landing-hero__actions`, and any other `.landing-hero*` selectors that are no longer referenced.
    - Leave the `.auth-layout`, `.auth-globe-stage`, and `.signal-readout` rules intact (they are still used elsewhere or kept as dead style-dead code per the design's explicit note — but remove only `.landing-hero*`).
    - _Files: `frontend/src/styles.css`_
    - (satisfies Req 1.2, 7.5)

  - [x] 8.3 Write example-based unit tests for `Landing`
    - Create `frontend/src/pages/__tests__/Landing.test.jsx`.
    - Wrap the component in a `MemoryRouter` + `AuthProvider` mock.
    - Assert: unauthenticated render shows exactly one `<main>`, no element with class `.landing-hero`, two buttons `Log In` / `Sign Up`, one `role="status"` element with `Prediction service`.
    - Assert: clicking `Log In` opens the modal in login mode; `Sign Up` opens register mode; Escape closes it (delegated to the existing `AuthModal`).
    - Assert: Tab order — first Tab focuses `Log In`, second Tab focuses `Sign Up`, subsequent Tabs never land on the `HeroStage` (it is `aria-hidden`).
    - Assert: when `isAuthenticated` flips to `true`, the mocked router records a navigate to `/dashboard`; when the mocked `navigate` throws, `clearAuth` is invoked (spy on context).
    - _Files: `frontend/src/pages/__tests__/Landing.test.jsx`_
    - (satisfies Req 2.3, 2.4, 2.8, 6.3, 6.4, 8.1, 8.3)

- [x] 9. Checkpoint - Hero page renders and backend contracts preserved
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Property-based tests for layout and scroll invariants
  - [x] 10.1 Write property test for full-bleed canvas and camera aspect (Property 1)
    - Create `frontend/src/pages/__tests__/hero-fullbleed.property.test.jsx`.
    - Expose a test-only ref from `EarthGlobe` (or via the `onModelLoaded` hook plus a ref forwarded to the internal camera) so the test can read `camera.aspect`.
    - Generate viewports with `fc.record({ w: fc.integer({ min: 360, max: 2560 }), h: fc.integer({ min: 480, max: 1600 }) })`.
    - For each sample: `Object.defineProperty(window, "innerWidth", { configurable: true, value: w })`, same for `innerHeight`; dispatch `new Event("resize")`; assert `canvas.clientWidth === w`, `canvas.clientHeight === h`, `Math.abs(camera.aspect - w/h) < 1e-3`.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - Header comment: `// Feature: globe-hero-ui, Property 1`.
    - _Files: `frontend/src/pages/__tests__/hero-fullbleed.property.test.jsx`_
    - (satisfies Property 1 / Req 1.1, 1.3, 1.5)

  - [x] 10.2 Write property test for no horizontal page scroll (Property 2)
    - Create `frontend/src/pages/__tests__/hero-scroll.property.test.jsx`.
    - Generator: `fc.integer({ min: 360, max: 2560 })`.
    - For each `w`, resize jsdom, render `<Landing/>`, assert `document.documentElement.scrollWidth <= w`.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - _Files: `frontend/src/pages/__tests__/hero-scroll.property.test.jsx`_
    - (satisfies Property 2 / Req 1.7)

  - [x] 10.3 Write property test for center-third exclusion of chrome (Property 3)
    - Create `frontend/src/components/hero/__tests__/chrome-exclusion.property.test.jsx`.
    - Generate `fc.record({ w: fc.integer({ min: 360, max: 2560 }), h: fc.integer({ min: 480, max: 1600 }) })`.
    - Render `<Landing/>`, read `getBoundingClientRect` for `.top-right-auth` and `.status-indicator` (relying on the inline-style-driven polyfill from `vitest.setup.js`).
    - Assert for each element: `(rect.right <= w/3 || rect.left >= 2*w/3) && (rect.bottom <= h/3 || rect.top >= 2*h/3)`.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - _Files: `frontend/src/components/hero/__tests__/chrome-exclusion.property.test.jsx`_
    - (satisfies Property 3 / Req 2.5, 2.6, 2.7, 3.3)

- [x] 11. Property-based tests for contracts and error resilience
  - [x] 11.1 Write property test for preserved API / Auth contract exports (Property 7)
    - Create `frontend/src/api/__tests__/contracts.property.test.js`.
    - Define a constant `CONTRACT_TUPLES` with entries like `{ moduleName: "api/client", exportName: "loginUser", arity: 1 }` for every export listed in the design's Property 7 (including the `getErrorMessage/2` default-arg note — encode the expected `.length` value per-entry).
    - Use `fc.constantFrom(...CONTRACT_TUPLES)` as the generator.
    - For each tuple, dynamically import the module, assert `typeof mod[name] === "function"` and `mod[name].length === arity`.
    - Additionally, render `<AuthProvider>` with a stub and assert the value object exposes `{ auth, user, isAuthenticated, login, register, logout, clearAuth }` with the four action props being functions.
    - Configure `fc.assert` with `{ numRuns: 100 }` (shrinks over the constant pool still catches regressions quickly).
    - _Files: `frontend/src/api/__tests__/contracts.property.test.js`_
    - (satisfies Property 7 / Req 6.5, 6.7, 6.9)

  - [x] 11.2 Write property test for no unhandled errors when backend unreachable (Property 8)
    - Create `frontend/src/pages/__tests__/network-errors.property.test.jsx`.
    - Mock `api.head`, `loginUser`, `registerUser` with fast-check-driven failures: `fc.record({ probeFailure: fc.constantFrom("NETWORK", "TIMEOUT", 500, 502, 503, 404), authFailure: fc.constantFrom("NETWORK", 401, 500) })`.
    - Render `<Landing/>`, drive a login then register attempt through the modal, unmount.
    - Collect `window.onerror` events, `unhandledrejection` events, and `console.error` calls during the run (the scene's `console.warn` for fallback is allowed).
    - Assert all three collections are empty.
    - Assert `StatusIndicator` text transitions to `Online` when `probeFailure` is an HTTP status and to `Offline` on `NETWORK`/`TIMEOUT`.
    - Configure `fc.assert` with `{ numRuns: 100 }`.
    - _Files: `frontend/src/pages/__tests__/network-errors.property.test.jsx`_
    - (satisfies Property 8 / Req 8.6)

- [x] 12. Typography and accessibility tests
  - [x] 12.1 Write typography integration test
    - Create `frontend/src/__tests__/typography.test.js`.
    - Load `index.html` as a string (via `fs.readFileSync` in the test) and assert it contains `display=swap`, `preconnect` to `fonts.googleapis.com`, and both `Space Grotesk` and `Inter Tight`.
    - In a second case, render the app, read `getComputedStyle(document.documentElement).getPropertyValue("--font-display")` and assert it includes `"Space Grotesk"` and the system-fallback stack; same for `--font-body` and `"Inter Tight"`.
    - _Files: `frontend/src/__tests__/typography.test.js`_
    - (satisfies Req 5.1, 5.3, 5.4, 5.5, 5.6, 5.7)

  - [x] 12.2 Write accessibility snapshot test
    - Create `frontend/src/pages/__tests__/landing.a11y.test.jsx`.
    - Use `jest-axe` (`expect.extend(toHaveNoViolations)`) with the landing page rendered at 1280×800 and then at 414×896 (mobile) via jsdom resize.
    - Assert `axe(container)` has zero violations in both cases.
    - _Files: `frontend/src/pages/__tests__/landing.a11y.test.jsx`_
    - (satisfies Req 8.1, 8.2, 8.4, 8.5)

- [x] 13. Final verification pass
  - [x] 13.1 Run lint, build, and the full test suite
    - Run `npm --prefix frontend run lint` (if the repo defines `lint`; otherwise skip with a note).
    - Run `npm --prefix frontend run build` and confirm Vite produces a green build with no new warnings about missing assets (the GLB must resolve).
    - Run `npm --prefix frontend run test` and confirm every property test executes ≥ 100 iterations and the suite is green.
    - Manually grep for leftover `.landing-hero` references in `frontend/src/`; there should be none.
    - _Files: none modified (verification only)_
    - (satisfies Req 1.7, 4.7, 4.8, 6.5, 6.6, 6.9, 8.6)

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP: namely GLB compression (3.3) and every test task. Core implementation tasks are never marked optional.
- Every property test MUST be configured with `{ numRuns: 100 }` or higher per the repo's PBT standard.
- The satellite asset download in task 3.1 is the only external dependency that cannot be produced by a code-gen agent alone. Treat it as a prerequisite for task 6.1 and for every test that exercises `EarthGlobe` end-to-end (tests otherwise stub `GLTFLoader`, so they do not block on the binary).
- Backend contract preservation is enforced by Property 7. Any change that removes or renames an export from `frontend/src/api/client.js` or `frontend/src/auth/AuthContext.jsx` will surface immediately as a failing iteration.
- `AuthLayout.jsx` is kept in the tree but is no longer mounted on `/`. Do not delete it — other routes may adopt it later.
- Checkpoint tasks (9, 14) and top-level parent tasks are not present in the dependency graph below; only leaf sub-tasks with decimal notation appear there.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "3.1", "3.2", "4.1", "5.1", "8.2"] },
    { "id": 1, "tasks": ["1.2", "3.3", "4.2", "6.1", "7.1", "7.2", "7.4"] },
    { "id": 2, "tasks": ["1.3", "6.2", "6.3", "6.4", "7.3", "7.5", "8.1", "11.1"] },
    { "id": 3, "tasks": ["1.4", "8.3", "10.1", "10.2", "10.3", "11.2", "12.1", "12.2"] },
    { "id": 4, "tasks": ["13.1"] }
  ]
}
```

## Workflow Completion

This workflow is complete — the tasks document has been created. You can now begin executing tasks by opening `tasks.md` and clicking "Start task" next to any task item. Tests marked with `*` are optional; everything else is required for a complete implementation.
