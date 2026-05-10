# Design Document

## Overview

The `globe-hero-ui` feature reshapes the unauthenticated landing route (`/`) so that the 3D Earth and its orbiting satellite become the full-bleed centerpiece of the browser window, rather than a decorative visual confined behind a centered glass card. The existing `Landing.jsx` renders a `.landing-hero` panel with copy, auth buttons, and a status pill stacked on top of an `EarthGlobe` scene clamped to `min(780px, 92vmin)`. This design removes that card entirely, replaces it with a new `Globe_Hero_View` page whose Three.js canvas fills `100vw × 100vh`, relocates the auth affordances to two pill buttons fixed in the top-right corner, moves the prediction-service status pill to the bottom-left corner, introduces a realistic glTF satellite (ISS) in place of the current primitive-mesh satellite, and installs a professional aerospace/technical typography system across the entire site.

All backend contracts stay intact. No files under `backend/` are touched. The `api/client.js` functions, the `AuthContext` provider shape, and the refresh-token interceptor are preserved verbatim. The redesign is scoped to the frontend landing experience and to the shared typography variables on `:root`.

Key design goals:

- **Full-bleed hero**: the Three.js canvas fills the viewport; no card, border, or frame surrounds it.
- **Non-overlapping UI**: every UI chrome element (auth buttons, status pill) stays out of the horizontal AND vertical center third of the viewport, so the globe is always the visual focus.
- **Realistic satellite**: a glTF/GLB model with PBR materials replaces the box+cone primitive, while orbital parameters (radius, inclination, direction) are preserved.
- **Professional typography**: an aerospace/technical type pairing (default: Space Grotesk display + Inter Tight body) with `font-display: swap`, CSS variables, and a system fallback stack so the site reads like an engineering product.
- **Safety**: scene errors (texture, shader, WebGL context loss, model load failure) are contained inside the scene module. Auth navigation failures roll back via `clearAuth`. Backend unreachability degrades to an "Offline" label without console errors.

## Architecture

### Layering

The landing route is rebuilt around a new full-bleed page component (`GlobeHeroView`) that replaces `Landing.jsx`'s content. `AuthLayout` is bypassed on `/` because its current CSS (`display: grid; place-items: center; padding: 48px 24px`) actively fights the full-bleed intent. Authenticated routes continue to use `AppShell`; `AuthLayout` remains available for any future auth-but-not-landing pages but is no longer used by `/`.

```mermaid
graph TD
  A[App.jsx Routes] -->|path="/"| B[GlobeHeroView]
  A -->|other routes| C[ProtectedRoute + AppShell]

  B --> D[HeroStage<br/>fixed 100vw/100vh]
  B --> E[TopRightAuthBar<br/>fixed top:24 right:24]
  B --> F[StatusIndicator<br/>fixed bottom:24 left:24]
  B --> G[AuthModal<br/>existing]

  D --> H[Starfield<br/>z-index:-3]
  D --> I[EarthGlobe<br/>z-index:-2]

  I --> J[useThreeScene hook]
  J --> K[GLTFLoader<br/>loads /models/iss.glb]
  J --> L[Texture loads<br/>earth_atmos, earth_specular]
  J --> M[Atmosphere shader]

  E -->|Log In click| G
  E -->|Sign Up click| G
  G -->|submit| N[loginUser/registerUser<br/>api/client.js - unchanged]
  N --> O[AuthContext.login/register<br/>unchanged]
  O -->|isAuthenticated=true| P[Navigate to /dashboard]

  F -->|probe every 30s| Q[healthProbe<br/>HEAD API_BASE_URL]
```

### Route & layout strategy

- `App.jsx` keeps `<Route path="/" element={<Landing />} />`; `Landing.jsx` is refactored to render `<GlobeHeroView />` (or the `Landing` component itself is rewritten — same effect). No changes to protected routes or redirects.
- `GlobeHeroView` renders `<main className="globe-hero">` as the top-level landmark, avoiding `AuthLayout` to escape its centered padding grid.
- Inside `<main>`, the tab order is explicit: `TopRightAuthBar` (Log In → Sign Up) → `StatusIndicator` (non-focusable, `role="status"`) → decorative hero (`aria-hidden`). This satisfies Req 2.8 and 8.4 without needing `tabindex` hacks.
- The existing `AuthModal` portal is mounted at the bottom of `GlobeHeroView` and controlled via a `authMode` state (`null | "login" | "register"`), identical to today's `Landing.jsx`.

### Z-index and stacking

The Hero_Stage is the topmost visual *background* layer; chrome and modal sit above it. Concretely:

| Layer | z-index | Element |
| --- | --- | --- |
| Modal overlay | 1000 (existing) | `AuthModal` backdrop |
| Chrome | 50 | `TopRightAuthBar`, `StatusIndicator` |
| Globe canvas wrapper | 1 | `HeroStage` |
| Starfield backdrop | 0 | `Starfield` |
| Body gradient | -1 (body CSS) | `body` + `body::before` stars |

The `HeroStage` uses `position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none` so it does not create a scroll container and does not block keyboard focus on chrome. The canvas itself is `aria-hidden="true"` (already enforced by `useThreeScene` which sets `domElement.setAttribute("aria-hidden", "true")`).

### Center-third exclusion zone

All chrome must avoid the center third of both axes at every supported viewport size. This is enforced by:

1. **Fixed corner positioning**: `TopRightAuthBar` is `position: fixed; top: 24px; right: 24px` (stack of two pills). `StatusIndicator` is `position: fixed; bottom: 24px; left: 24px`. At 360px-wide viewports the control widths (< 280px combined) still leave the center third untouched.
2. **Max-width caps**: Both chrome groups have `max-width: calc((100vw - 48px) / 3)` so they can never visually grow past the outer third. This is a defensive cap; with two pill buttons and a compact pill readout, it almost never engages.
3. **No tooltips/toasts in center**: notifications, loading spinners, and tooltips introduced by the feature must render in the same corner zones as their trigger or in a top-center banner that fits within the top outer-sixth — but this feature introduces no such UI.

### Health probe strategy

`StatusIndicator` reports backend reachability without introducing any new backend endpoint. The probe:

1. Issues `axios.head(API_BASE_URL, { timeout: 2500 })` on mount and every 30 seconds thereafter, using an `AbortController` that is cancelled on unmount.
2. Treats **any HTTP response** (2xx, 3xx, 4xx, 5xx) as `"Online"` — because any HTTP response confirms the FastAPI process is reachable. Only network errors (`ECONNREFUSED`, `ETIMEDOUT`, `ERR_NETWORK`) or abort errors are treated as `"Offline"`.
3. Falls back to `axios.get` if `HEAD` returns a CORS/method-not-allowed network-level failure in some deployments. Per investigation of `api/client.js`, the axios instance is shared, so the request will pick up the `Bearer` token if present but will not trigger the refresh interceptor for non-401 failures on this unauthenticated page.
4. Never throws into the render tree. A try/catch inside the `useEffect` converts all failures to `setStatus("Offline")`.

This approach does not change `api/client.js` and does not add a backend contract.

### Typography loading

Fonts are loaded via `<link rel="preconnect">` + `<link rel="stylesheet">` tags injected into `frontend/index.html`. The default pairing (Space Grotesk + Inter Tight) is served by Google Fonts with `display=swap`. CSS variables on `:root` (`--font-display`, `--font-body`) drive all rules. Because `font-display: swap` renders the system-fallback immediately and swaps in the web font as soon as it loads, FOUT is bounded by the system fallback rather than blocking; the swap event itself is typically < 100ms on a warm cache. This satisfies Req 5.5 without inlining font binaries.

If the security posture later requires self-hosting, the design supports dropping `woff2` files under `frontend/public/fonts/` and declaring `@font-face` in `styles.css` — structure is unchanged.

### Satellite model loading

A single glTF/GLB asset is placed under `frontend/public/models/iss.glb`. The existing `useThreeScene` hook is extended (via a new `useGLTFModel` helper *or* inline in `EarthGlobe.jsx`'s `setupScene`) to load the model asynchronously with three.js's `GLTFLoader`. Key details:

- Loading happens inside `setupScene`, after the earth sphere and atmosphere are added. An `AbortController` is passed to the loader via `loader.manager` signal-check or is wrapped in a disposed-flag captured by the cleanup closure — if the component unmounts before load resolves, the resulting scene graph is traversed and disposed.
- On successful load, the model's bounding box is computed (`new THREE.Box3().setFromObject(gltf.scene)`). Its longest side is normalized to a target size equal to `earthRadius * 0.07` (≈7% of earth diameter, well inside the 3%-12% band from Req 4.5). The model is parented to the existing `orbit` group and placed at `orbitRadius` on the x-axis, inheriting all orbital motion.
- Every mesh is traversed to `castShadow = true`, `receiveShadow = true`, and materials are left as the PBR materials the glTF ships with (typically `MeshStandardMaterial`).
- On error (network fail, corrupt GLB, parse error), a `console.warn` is emitted and the scene continues without a satellite (Req 4.7). A try/catch wraps the whole `setupScene` body so any Three.js-level error during setup, animation, or rendering is trapped before it reaches React's error boundary (Req 4.8).
- Disposal: the scene-wide `disposeObject` walker in `useThreeScene` already traverses every child, disposing geometries, materials, and textures. The glTF scene is added as a normal child of `orbit`, so disposal is free (Req 4.9). Any externally-loaded texture stored on materials is caught by `disposeMaterial` which iterates `Object.values(material)` looking for `.isTexture`.

### Data flow (auth)

Unchanged from today. Rebuilding the page does not alter how login/register flows through `AuthContext`:

```
TopRightAuthBar -> authMode state -> AuthModal -> LoginForm/RegisterForm
  -> AuthContext.login/register -> loginUser/registerUser (api/client.js)
  -> persistAuth writes localStorage + dispatches satellite-auth-updated
  -> AuthContext syncs setAuth -> isAuthenticated=true
  -> GlobeHeroView top-level <Navigate to="/dashboard" replace />
```

If `<Navigate>` does not take effect for any reason (e.g., because a guard throws), `GlobeHeroView` wraps the navigation trigger in a try/catch/finally and calls `clearAuth()` in the catch to satisfy Req 6.4. In practice `<Navigate>` is declarative and cannot throw; the rollback path is invoked from a `useEffect` that runs `navigate('/dashboard', { replace: true })` imperatively after successful auth and handles thrown errors from `navigate`.

## Components and Interfaces

### `GlobeHeroView` (new — replaces `Landing.jsx`)

**Location:** `frontend/src/pages/Landing.jsx` (rewritten) — keeping the existing file path preserves the `App.jsx` route without modification.

**Responsibilities:**
- Render `<main className="globe-hero">` as the single landmark.
- Mount `HeroStage` (canvas) fullbleed.
- Mount `TopRightAuthBar` and `StatusIndicator`.
- Manage `authMode` state and `AuthModal` mounting.
- Redirect to `/dashboard` when `isAuthenticated` flips to true.

**Props:** none.

**Pseudocode:**
```jsx
export default function Landing() {
  const { isAuthenticated, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Navigation to /dashboard failed", err);
      clearAuth(); // Req 6.4 rollback
    }
  }, [isAuthenticated, navigate, clearAuth]);

  return (
    <main className="globe-hero" aria-label="Satellite Tracker landing">
      <HeroStage />
      <TopRightAuthBar onLogin={() => setAuthMode("login")} onSignup={() => setAuthMode("register")} />
      <StatusIndicator />
      <AuthModal open={authMode !== null} initialMode={authMode ?? "login"} onClose={() => setAuthMode(null)} />
    </main>
  );
}
```

### `HeroStage` (new)

**Location:** `frontend/src/components/hero/HeroStage.jsx`

**Responsibilities:**
- Full-bleed fixed container sized to `100vw × 100vh`.
- Hosts `Starfield` (backdrop) and `EarthGlobe` (primary).
- Marked `aria-hidden="true"`.
- `pointer-events: none` so chrome above it is clickable.

**Props:** none.

**Markup:**
```jsx
<div className="hero-stage" aria-hidden="true">
  <Starfield className="hero-starfield" densityVariant="dense" />
  <EarthGlobe className="hero-globe" />
</div>
```

**CSS:**
```css
.hero-stage {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.hero-stage .earth-globe-scene,
.hero-stage .scene-container,
.hero-stage .three-scene-fill,
.hero-stage .three-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
```

### `EarthGlobe` (existing — extended)

**Location:** `frontend/src/components/3d/EarthGlobe.jsx` (unchanged path).

**Changes:**
- Remove the primitive satellite (box body + box solar panels + cone dish).
- Load `/models/iss.glb` via `GLTFLoader`, normalize scale to 7% of earth diameter, attach to the existing `orbit` group at `orbitRadius`.
- Keep the trail torus, orbital inclination (`26°` x-axis, `-12°` z-axis), and orbit speed.
- Wrap the setup in a try/catch and the loader callbacks in disposed-flag guards.

**New props:**
- `className?: string` (unchanged)
- `modelUrl?: string` — defaults to `/models/iss.glb`; exposed for tests.
- `onModelLoaded?: (model) => void` — optional hook for tests to observe load completion.

**Disposal:** no changes required. `useThreeScene` already disposes every descendant of `scene` on unmount.

### `TopRightAuthBar` (new)

**Location:** `frontend/src/components/hero/TopRightAuthBar.jsx`

**Responsibilities:**
- Render exactly two pill buttons side by side: **Log In** and **Sign Up**.
- Fixed top-right positioning (24px insets on both sides).
- Keyboard focusable in tab order before decorative chrome.
- Accessible names exactly "Log in" and "Sign up".

**Props:**
```ts
{
  onLogin: () => void;
  onSignup: () => void;
}
```

**Markup:**
```jsx
<nav className="top-right-auth" aria-label="Account">
  <button type="button" className="auth-pill ghost" onClick={onLogin}>
    <LogIn size={16} aria-hidden="true" />
    <span>Log In</span>
  </button>
  <button type="button" className="auth-pill accent" onClick={onSignup}>
    <UserPlus size={16} aria-hidden="true" />
    <span>Sign Up</span>
  </button>
</nav>
```

**CSS (key rules):**
```css
.top-right-auth {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 50;
  display: inline-flex;
  gap: 10px;
  max-width: calc((100vw - 48px) / 3); /* center-third exclusion guard */
}
.auth-pill {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 40px; padding: 0 16px;
  border: 0; border-radius: 999px;
  font-family: var(--font-body);
  font-weight: 600; letter-spacing: 0.01em;
  color: var(--ink);
  background: rgba(12, 20, 33, 0.72);
  box-shadow:
    inset 0 0 0 1px rgba(214, 235, 255, 0.14),
    0 10px 24px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  transition: background 160ms ease, box-shadow 160ms ease;
}
.auth-pill.accent {
  color: #082319;
  background: var(--mint);
  box-shadow: 0 10px 28px rgba(142, 255, 240, 0.28);
}
.auth-pill:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .top-right-auth {
    top: 16px; right: 16px; gap: 8px;
  }
  .auth-pill { padding: 0 12px; font-size: 0.9rem; min-height: 36px; }
  .auth-pill span { /* text stays visible; we do NOT collapse to a menu */ }
}
@media (max-width: 479px) {
  /* stacked layout below very narrow viewports, still top-right */
  .top-right-auth { flex-direction: column; align-items: flex-end; }
}
```

Mobile behavior (Req 2.7): at ≥480px the two pills remain side-by-side; below 480px they stack vertically but each remains individually activatable — no menu or collapsed trigger. This ensures each action has its own accessible name and does not occupy the center of the viewport.

### `StatusIndicator` (new, adapted from `.signal-readout`)

**Location:** `frontend/src/components/hero/StatusIndicator.jsx`

**Responsibilities:**
- Bottom-left pill showing `"Prediction service"` label + status value (`"Online"` | `"Offline"` | `"Checking…"`).
- Poll health probe every 30s with abortable axios HEAD.
- Announce status via `role="status"` + live region so SR users hear changes.

**Props:** none.

**State:** `status: "checking" | "online" | "offline"`.

**Probe logic:**
```js
useEffect(() => {
  let cancelled = false;
  const controller = new AbortController();
  async function probe() {
    try {
      await api.head("/", { signal: controller.signal, timeout: 2500 });
      if (!cancelled) setStatus("online");
    } catch (err) {
      if (axios.isCancel(err) || err?.name === "CanceledError") return;
      // Any HTTP response (4xx/5xx) => reachable => online
      if (err?.response) {
        if (!cancelled) setStatus("online");
      } else if (!cancelled) {
        setStatus("offline");
      }
    }
  }
  probe();
  const id = window.setInterval(probe, 30_000);
  return () => {
    cancelled = true;
    controller.abort();
    window.clearInterval(id);
  };
}, []);
```

**Markup:**
```jsx
<div className="status-indicator" role="status" aria-live="polite">
  <span className="status-label">
    <RadioTower size={14} aria-hidden="true" />
    Prediction service
  </span>
  <strong className={`status-value status-${status}`}>{label(status)}</strong>
</div>
```

**CSS (key rules):**
```css
.status-indicator {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 50;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--mint);
  background: rgba(12, 20, 33, 0.72);
  box-shadow:
    inset 0 0 0 1px rgba(214, 235, 255, 0.14),
    0 10px 24px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  max-width: calc((100vw - 48px) / 3);
}
.status-online { color: var(--mint); }
.status-offline { color: var(--danger); }
.status-checking { color: var(--muted); }
@media (max-width: 767px) {
  .status-indicator { bottom: 16px; left: 16px; font-size: 0.85rem; }
}
```

### `AuthModal` (existing — unchanged)

Keep using `frontend/src/features/auth/AuthModal.jsx` exactly as-is. Focus trap, Escape-to-close, and body scroll lock are already implemented.

### `AuthLayout` (existing — kept but no longer used by `/`)

`AuthLayout.jsx` remains in the tree for future internal auth pages. Its CSS (`.auth-layout`, `.auth-globe-stage`) is left intact. The landing route simply does not mount it. The existing `.landing-hero` CSS block in `styles.css` becomes dead code and is removed to reduce confusion.

### Typography files

- `frontend/index.html` gains `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, and a single `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap">`.
- `frontend/src/styles.css` gains new CSS variables on `:root`:
  ```css
  :root {
    --font-display: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-body: "Inter Tight", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  html, body { font-family: var(--font-body); }
  h1, h2, h3, h4, .brand-lockup, .eyebrow { font-family: var(--font-display); letter-spacing: -0.01em; }
  ```
- The current `font-family: Inter, ui-sans-serif, system-ui, ...` on `:root` is replaced, satisfying Req 5.3.

## Data Models

This feature is primarily presentational; data models are minimal.

### Auth state (unchanged)

Shape preserved exactly as today, consumed from `AuthContext`:

```ts
type Auth = {
  userId: number;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
  expiresAt: number;
};

type AuthContextValue = {
  auth: Auth | null;
  user: { id: number; email: string } | null;
  isAuthenticated: boolean;
  login: (payload) => Promise<Auth>;
  register: (payload) => Promise<Auth>;
  logout: () => Promise<void>;
  clearAuth: () => void;
};
```

No changes to fields, no renames, no removals (Req 6.9).

### Health state (new, local to `StatusIndicator`)

```ts
type HealthStatus = "checking" | "online" | "offline";

// internal only; not stored globally, not persisted
```

### Modal state (new, local to `Landing`)

```ts
type AuthMode = null | "login" | "register";
```

Identical in shape to what `Landing.jsx` uses today.

## Prework / Asset Sourcing

### Satellite 3D model

**Primary choice: International Space Station (ISS)** — immediately readable as a real spacecraft, has distinguishable solar panels + truss + modules, and is available from NASA in a license that is either public domain or CC-BY.

Recommended source (to be confirmed by implementer at download time):

| Attribute | Value |
| --- | --- |
| Asset name | `ISS_stationary.glb` |
| Format | glTF binary (`.glb`), single file with embedded textures |
| Origin | NASA 3D Resources (`nasa3d.arc.nasa.gov`) — the "International Space Station" model, OBJ converted to GLB via Blender export (or the ready-made GLB published by NASA's "ISS Mimic" project on GitHub, which ships under Apache-2.0 / public domain content). |
| License | NASA-created content is in the public domain in the US. NASA requests (but does not require) attribution: "Image credit: NASA". If a CC-BY 4.0 upload (e.g., on Sketchfab by NASA) is chosen, attribution string goes in `frontend/public/models/ATTRIBUTIONS.md`. |
| Estimated size | 2.5 – 4.5 MB after Draco compression; uncompressed GLB ≈ 8–15 MB. Implementer SHOULD run `gltfpack -c` or `gltf-transform draco` to keep payload under 4 MB before commit. |
| Placement | `frontend/public/models/iss.glb` |
| Fetch path in code | `/models/iss.glb` (served by Vite as a static asset) |

**Alternative (if ISS is too polygon-heavy):** a CC0 generic communication satellite with dish + solar panels from Poly Haven or Kenney's space asset pack. File would still land at `frontend/public/models/satellite.glb` and `modelUrl` would flip. The design explicitly parameterizes `modelUrl` on `EarthGlobe` to make this swap trivial.

**Attribution file:** `frontend/public/models/ATTRIBUTIONS.md` is created as part of this feature, noting the model source, license, and any required credit. The file is referenced from the repo root README in a follow-up PR (out of scope here) but ships with the asset.

### Typography assets

Primary pairing (recommended): **Space Grotesk (display) + Inter Tight (body)**. Both are open-source, SIL OFL 1.1 licensed, available via Google Fonts and as self-hostable `woff2` files. The aerospace/technical vibe comes from Space Grotesk's precise geometry and slightly narrow proportions; Inter Tight carries the body text with high legibility at small sizes.

Alternatives documented for easy swap via `--font-display` / `--font-body`:

| # | Display | Body | Vibe |
| --- | --- | --- | --- |
| 1 (default) | Space Grotesk | Inter Tight | Aerospace, precise, slightly geometric |
| 2 | IBM Plex Sans | IBM Plex Sans | Instrumentation / mission-control |
| 3 | General Sans | Satoshi | Modern technical, commercial-polish |

All alternatives are either OFL or Google-Fonts-served, all support weights 400/500/600/700 (Req 5.6).

**Loading strategy:** Google Fonts with `display=swap`. Browser paints system fallback immediately; swaps to web font on arrival. Warm cache FOUT ≤ 300ms (Req 5.5).

**System fallback stack:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` — preserves metrics, x-height, and readability when web fonts fail (Req 5.7).

### Favicon / public assets untouched

The `frontend/public/textures/earth_atmos.jpg` and `earth_specular.jpg` files are reused as-is. No favicon changes; `index.html` gains only font-loading tags plus, if missing, a `<meta name="theme-color" content="#05080f">`.

### Backend contract preservation — explicit enumeration

The following files and exports remain **byte-identical** under this feature:

- `frontend/src/api/client.js`
  - `api` (axios instance)
  - Interceptors (request auth header, response 401 refresh flow)
  - `getStoredAuth`, `persistAuth`, `clearStoredAuth`
  - `registerUser`, `loginUser`, `logoutUser`, `fetchCurrentUser`
  - `fetchLocations`, `fetchLocation`, `createLocation`, `updateLocation`, `deleteLocation`
  - `fetchPasses`, `refreshPasses`, `fetchPass`, `fetchPassStats`
  - `fetchSatellites`
  - `fetchAlerts`, `createAlert`, `updateAlert`, `deleteAlert`, `fetchAlert`, `fetchAlertHistory`, `fetchAlertStats`
  - `getErrorMessage`
- `frontend/src/auth/AuthContext.jsx` — provider value shape (`auth`, `user`, `isAuthenticated`, `login`, `register`, `logout`, `clearAuth`).
- All files under `backend/` — not modified.

Post-auth navigation stays on `react-router-dom`'s `useNavigate` / `<Navigate>`, identical to today's `Landing.jsx`. On navigation throw (imperative path), `clearAuth()` is invoked in the catch to satisfy Req 6.4.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is largely UI, which is normally outside PBT territory. However, several acceptance criteria express **universal invariants** — layout rules that must hold at *every* viewport size, contract surfaces that must hold for *every* exported function, and error containment that must hold for *every* failure shape. Those are exactly the kinds of statements PBT is well-suited for. Other criteria (DOM structure, mode-to-modal routing, accessibility assertions) are specific scenarios best covered by example-based unit tests and are NOT restated as properties here.

### Property 1: Hero stage is full-bleed and camera aspect tracks the viewport

*For any* viewport with width `w` in `[360, 2560]` and height `h` in `[480, 1600]`, after `<Landing/>` is mounted and laid out at that viewport size, the Three.js canvas element within `HeroStage` SHALL have `clientWidth === w` and `clientHeight === h`, and the underlying `PerspectiveCamera.aspect` SHALL equal `w / h` to within 3 decimal places.

**Validates: Requirements 1.1, 1.3, 1.5**

### Property 2: No horizontal page scroll at any supported viewport width

*For any* viewport width `w` in `[360, 2560]`, after `<Landing/>` is rendered at that width, `document.documentElement.scrollWidth` SHALL be less than or equal to `w` (i.e., no element overflows horizontally and no horizontal scrollbar appears).

**Validates: Requirement 1.7**

### Property 3: All chrome lies outside the viewport center third

*For any* viewport `(w, h)` in the supported range and *for any* chrome element `e` in `{ TopRightAuthBar, StatusIndicator }`, the bounding rectangle of `e` SHALL satisfy:

- `e.right <= w/3` **or** `e.left >= 2w/3` (horizontal exclusion), **and**
- `e.bottom <= h/3` **or** `e.top >= 2h/3` (vertical exclusion).

**Validates: Requirements 2.5, 2.6, 2.7, 3.3**

### Property 4: Satellite orbits at constant radius with preserved inclination and direction

*For any* pair of animation times `t1 < t2` in `[0, 60]` seconds, after the satellite model has loaded, the satellite's world-space distance from the earth center SHALL equal `orbitRadius` (2.05) to within a tolerance of `0.02`, the cross product `p(t1) × p(t2)` SHALL have its sign preserved along the inclined orbit normal (same direction of travel throughout), and the orbit group's Euler rotation on `x` SHALL remain `deg2rad(26)` and on `z` SHALL remain `deg2rad(-12)`.

**Validates: Requirement 4.4**

### Property 5: Satellite scale is clamped to between 3% and 12% of earth diameter

*For any* input bounding box with longest side `L` in `(0, 1000]` representing a glTF model's intrinsic size, the scale factor produced by the satellite-sizing helper SHALL satisfy: after applying it, the scaled model's longest side divided by the earth sphere's diameter (`2 * earthRadius`) lies in the closed interval `[0.03, 0.12]`.

**Validates: Requirement 4.5**

### Property 6: Scene errors are contained and do not propagate

*For any* error instance (with arbitrary message and type) injected into one of the scene entry points (texture loader callback, `GLTFLoader.load` error callback, shader compile path, or `animate` tick), the `EarthGlobe` component SHALL complete mount and unmount without:

- throwing a synchronous error up to React's error boundary,
- producing an `unhandledrejection` event on `window`,
- producing a `console.error` call originating from the component's own code.

Additionally, *for any* such failure in the `GLTFLoader` path, the `orbit` group's child count (excluding the trail torus) SHALL be `0`, i.e., the scene renders the Earth without a satellite.

**Validates: Requirements 4.7, 4.8**

### Property 7: Backend and auth contracts are preserved by exports

*For any* `(moduleName, exportName, arity)` tuple in the baseline contract list below, the corresponding export SHALL exist on the current module, SHALL be of `typeof "function"`, and SHALL report `.length === arity`:

- From `api/client.js`: `registerUser/1`, `loginUser/1`, `logoutUser/0`, `fetchCurrentUser/0`, `fetchLocations/0`, `fetchLocation/1`, `createLocation/1`, `updateLocation/2`, `deleteLocation/1`, `fetchPasses/1`, `refreshPasses/2`, `fetchPass/1`, `fetchPassStats/0`, `fetchSatellites/1` (default-arg), `fetchAlerts/0`, `createAlert/1`, `updateAlert/2`, `deleteAlert/1`, `fetchAlert/1`, `fetchAlertHistory/1` (default-arg), `fetchAlertStats/0`, `getStoredAuth/0`, `persistAuth/1`, `clearStoredAuth/0`, `getErrorMessage/2` (default-arg).
- From `auth/AuthContext.jsx`, the `value` produced by `AuthProvider`: every key in `{ auth, user, isAuthenticated, login, register, logout, clearAuth }` SHALL exist, and `login`, `register`, `logout`, `clearAuth` SHALL be functions.

Note: JavaScript `.length` does not count parameters with default values or rest parameters, so for functions with defaults the property asserts the number of required parameters; the test harness encodes this per-entry.

**Validates: Requirements 6.5, 6.7, 6.9**

### Property 8: No unhandled errors when the backend is unreachable

*For any* simulated backend failure mode `f` in `{ network error, timeout, 500, 502, 503, 404 }` applied to the axios HEAD health probe used by `StatusIndicator`, and *for any* simulated failure `g` applied to `loginUser` / `registerUser` invoked from `AuthModal`, `<Landing/>` SHALL mount, render, and unmount without:

- producing any `window.onerror` events,
- producing any `unhandledrejection` events,
- producing any `console.error` calls (informational `console.warn` for the scene's load-failure fallback is allowed and covered by Property 6).

The `StatusIndicator` text SHALL transition to either `"Online"` (when an HTTP response is received, regardless of status) or `"Offline"` (when no response is received).

**Validates: Requirement 8.6**

## Error Handling

### Scene errors (Three.js / WebGL)

- **Texture load failure** (`earth_atmos.jpg`, `earth_specular.jpg`): Three.js's `TextureLoader` does not throw synchronously; failures are reported via the optional `onError` callback. Attach a callback that logs `console.warn("Earth texture failed to load", err)` and continues. The earth mesh will render as a flat sphere with its base material color — acceptable degradation.
- **Shader compile failure** (atmosphere glow): `WebGLRenderer` catches compile errors and logs via `gl.getShaderInfoLog`. Wrap the `scene.add(atmosphere)` call in a try/catch; on failure, skip the atmosphere and continue with earth + satellite.
- **GLTF load failure** (`/models/iss.glb`): `GLTFLoader.load(url, onLoad, onProgress, onError)` routes failures to `onError`. Our handler emits `console.warn("ISS model load failed, rendering without satellite", err)` and leaves the `orbit` group without the satellite child. The trail torus still renders, preserving the visual hint of an orbit.
- **Disposed-before-resolve**: the `setupScene` closure owns a `disposedFlag` ref set by the `cleanup` callback returned from the controller. If the GLTF `onLoad` callback runs after the flag is set, it calls `disposeObject(gltf.scene)` and returns without adding the model to the scene. This prevents memory leaks when navigation happens during load.
- **WebGL context loss**: `renderer.domElement` emits `webglcontextlost` events. Attach a listener that calls `event.preventDefault()` (requests restoration) and suspends animation; on `webglcontextrestored`, re-run `setupScene`. Implementation is best-effort — if restoration fails, the scene remains blank but the page does not crash.
- **Any animation-tick throw**: wrap the `sceneController.animate` call inside `renderFrame` in a try/catch. On first throw, log `console.warn` and null out `sceneController.animate` so subsequent frames skip animation but keep rendering.

These changes localize error handling inside the `EarthGlobe.jsx` scene module and a small extension to `useThreeScene.js` (the try/catch around `animate`). No errors reach React's error boundary.

### Network errors (backend reachability)

- **`StatusIndicator` health probe**: per the loop in "Components — StatusIndicator", all failures are caught. Any HTTP response => `"Online"`. Any network-level failure => `"Offline"`. Abort/cancel errors are ignored (expected during unmount or re-poll).
- **`loginUser` / `registerUser`**: failures bubble up to the existing `LoginForm` / `RegisterForm` which already render an inline error message through `getErrorMessage`. Nothing new here.
- **Refresh-token flow**: the existing 401 interceptor in `api/client.js` is untouched. On post-landing routes the interceptor behaves as before.

### Navigation errors

- **Post-auth redirect**: `useEffect(() => { try { navigate('/dashboard', { replace: true }); } catch (err) { console.error(err); clearAuth(); } }, [isAuthenticated])`. The `try/catch` is defensive — `react-router-dom`'s `navigate` is not specified to throw — but it satisfies Req 6.4.

### Typography / font load failures

- **Google Fonts unreachable**: the stylesheet `<link>` fails. Browser falls back to the system stack defined in `--font-display` / `--font-body` fallback list. Visual quality degrades slightly; no functional regression. No JS-level handling needed (Req 5.7).

### Accessibility failure paths

- **Runtime contrast calculation unavailable**: we do not compute contrast at runtime; the design specifies static color tokens known to meet AA over the darkest regions of the globe (e.g., `--mint` on `rgba(12, 20, 33, 0.72)` panel background meets 4.5:1). If future instrumentation flags a violation, the text stays rendered (Req 8.5) and the color is adjusted in source.

### Reduced-motion

- Existing `useReducedMotion` hook in `useThreeScene.js` already short-circuits animation speeds. No new handling required.

## Testing Strategy

### Overall approach

- **Unit tests** (Vitest + React Testing Library): DOM structure, specific interactions, contract smoke checks.
- **Property-based tests** (fast-check inside Vitest): the eight correctness properties listed above.
- **Integration / smoke**: one manual visual check per released build (no changes to existing smoke strategy).
- **Accessibility**: `axe-core` assertion at a representative viewport as part of the unit suite.

Existing test setup: the repo does not appear to ship a test runner under `frontend/`. This feature introduces Vitest + `@testing-library/react` + `fast-check` as `devDependencies`. Vitest is chosen because it shares Vite's config and is the lightest-weight option compatible with the existing toolchain.

### Unit / example-based tests

| File | Asserts |
| --- | --- |
| `Landing.test.jsx` | Unauthenticated render shows two buttons ("Log In", "Sign Up") and a status pill; `.landing-hero` is absent; `<main>` landmark exists exactly once. |
| `Landing.test.jsx` | Clicking "Log In" opens `AuthModal` in login mode; "Sign Up" opens register mode; Escape closes it. |
| `Landing.test.jsx` | Keyboard tab order: first Tab lands on "Log In", second Tab on "Sign Up". |
| `Landing.test.jsx` | When `isAuthenticated` flips to `true`, `<Navigate to="/dashboard" replace />` is invoked (asserted via a mocked router). |
| `Landing.test.jsx` | When `navigate` throws, `clearAuth` is called (spy on `AuthContext`). |
| `TopRightAuthBar.test.jsx` | Computed `position: fixed`, `top: 24px`, `right: 24px` at width 1280; pills have accessible names matching `/log in/i` and `/sign up/i`. |
| `StatusIndicator.test.jsx` | Mocked `api.head` resolving with 200 -> text "Online". Mocked `api.head` rejecting with `ERR_NETWORK` -> text "Offline". Mocked `api.head` rejecting with 500 response -> text "Online" (server reachable). Cleanup: `AbortController.abort` called on unmount. |
| `StatusIndicator.test.jsx` | `role="status"` with `aria-live="polite"` is present. |
| `EarthGlobe.test.jsx` (with `three` mocked lightly) | Default `modelUrl` prop is `/models/iss.glb`. After mock load, `orbit.children` includes a group loaded from the stub, and the old primitive-mesh (box body) is absent. |
| `EarthGlobe.test.jsx` | Reduced-motion mock: satellite orbit speed uses the reduced value; earth spin uses the reduced value. |
| `typography.test.js` | `:root` CSS custom properties `--font-display` and `--font-body` both resolve to strings that include `"Space Grotesk"` / `"Inter Tight"` respectively plus the system-fallback stack; `index.html` contains `display=swap` and `preconnect` tags. |
| `a11y.test.jsx` | `axe(<Landing/>)` at 1280×800 and 414×896 returns zero violations for the landing markup. |

### Property-based tests (fast-check)

Vitest + `fast-check`. Each property test configured for a **minimum of 100 iterations** and tagged in source with:

```js
// Feature: globe-hero-ui, Property N: <exact property text from design>
```

Mapping:

| Test file | Property | Input generator |
| --- | --- | --- |
| `hero.property.test.jsx` — "full-bleed canvas" | P1 | `fc.record({ w: fc.integer({ min: 360, max: 2560 }), h: fc.integer({ min: 480, max: 1600 }) })`. Uses `Object.defineProperty(window, 'innerWidth'/'innerHeight')` + dispatch `resize` event in jsdom, asserts canvas `clientWidth`/`clientHeight` and reads `camera.aspect` from a test-only ref exposed by `EarthGlobe`. |
| `hero.property.test.jsx` — "no horizontal scroll" | P2 | `fc.integer({ min: 360, max: 2560 })`; renders and asserts `document.documentElement.scrollWidth <= w`. |
| `chrome-exclusion.property.test.jsx` | P3 | `fc.record({ w, h })`; for each, iterates `['.top-right-auth', '.status-indicator']`, reads bounding rects (mock-polyfilled in jsdom based on computed styles), asserts center-third exclusion. |
| `orbit.property.test.jsx` | P4 | `fc.array(fc.float({ min: 0, max: 60 }), { minLength: 2, maxLength: 10 })` — arrays of time samples. Runs the scene animator stepwise, snapshots satellite world position, asserts `|p|` ≈ `orbitRadius` and direction of travel invariant across samples. |
| `satellite-size.property.test.js` | P5 | `fc.float({ min: 0.001, max: 1000 })` longest-side inputs. Calls a pure helper `scaleModelToEarth(longestSide, earthRadius)` extracted from `EarthGlobe.jsx` and asserts `(longestSide * returnedScale) / (2 * earthRadius) ∈ [0.03, 0.12]`. |
| `scene-errors.property.test.jsx` | P6 | `fc.oneof(fc.constantFrom(new TypeError('x'), new Error('corrupt glb'), new DOMException('abort', 'AbortError'), ...), fc.string().map(msg => new Error(msg)))`; injects into mocked `GLTFLoader.load` error callback and into `TextureLoader.load` error callback; asserts no `console.error`, no `unhandledrejection`, mount/unmount clean. |
| `contracts.property.test.js` | P7 | `fc.constantFrom(...CONTRACT_TUPLES)`; for each `(module, name, arity)`, imports module and asserts `typeof m[name] === 'function'` && `m[name].length === arity`. (Strictly speaking the input space is finite, so fast-check here acts as a parameterized iteration with shrinking — still valuable for clear failure localization.) |
| `network-errors.property.test.jsx` | P8 | `fc.record({ probeFailure: fc.constantFrom('NETWORK', 'TIMEOUT', 500, 502, 503, 404), authFailure: fc.constantFrom('NETWORK', 401, 500) })`; mocks `api.head` and `loginUser`/`registerUser` accordingly; renders `<Landing/>`, drives login+register attempts, collects `console.error` calls and `unhandledrejection` events; asserts both are empty. |

Supporting implementation notes for PBT:

- Extract satellite-size computation into a pure helper (`src/components/3d/satelliteScale.js`) so it can be property-tested without Three.js. Signature: `scaleModelToEarth(longestSide: number, earthRadius: number, target = 0.07): number` returning a scale factor such that `longestSide * scale === target * 2 * earthRadius`, clamped so the result stays in `[0.03, 0.12]`.
- For P1 / P2 / P3, wrap `ResizeObserver` in jsdom via `resize-observer-polyfill` (registered in `vitest.setup.js`). Layout numbers in jsdom are approximate — where precise `getBoundingClientRect` values are needed, mirror CSS fixed-insets (24px / auto / 24px) into numeric expectations; do not rely on browser layout.
- For P6, use a lightweight three.js mock that exposes `GLTFLoader` with a programmable `load` implementation; the real `EarthGlobe` imports from `three/examples/jsm/loaders/GLTFLoader.js` — tests alias that path via Vite's `resolve.alias` in `vitest.config.ts`.

### Integration / smoke checks

- **Visual smoke** (manual, one-time per release): open `/` at 1920×1080, confirm the ISS is visibly orbiting at realistic size and the globe fills the window with no card.
- **Static check on index.html**: a CI grep confirms `display=swap` and `preconnect` tags remain in `frontend/index.html` (guards against regression of Req 5.5).
- **Git-level check (Req 6.6)**: the feature's PR description asserts "no files under `backend/` modified"; if desired, a repo CI rule enforces this.

### What we explicitly do NOT property-test

- Visual styling of the auth pills (color, border-radius) — covered by snapshot / design review.
- Focus trap and `Escape` behavior of `AuthModal` — unchanged, existing implementation is trusted.
- The 401 refresh interceptor — unchanged; regression smoke only.
- Font quality, FOUT timing — not computable from within a jsdom test; a single `display=swap` presence check is enough.
- WCAG contrast values at runtime — `axe-core` snapshot covers the common case; runtime calculation is out of scope per Req 8.5.

### Test execution

- Property tests run with fast-check default `numRuns: 100` — do not reduce below 100 per configured standard.
- Seed is left to fast-check's default randomization; failing seeds are printed by fast-check on counterexample and committed to the test file as `fc.configureGlobal({ examples: [/* counterexample */] })` additions when regressions occur.
