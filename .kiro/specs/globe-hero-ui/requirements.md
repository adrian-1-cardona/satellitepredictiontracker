# Requirements Document

## Introduction

Rework the unauthenticated landing experience of the Satellite Tracker web frontend so that the 3D Earth and its orbiting satellite become the centerpiece of the window — not visuals confined behind or below a glass card. Today the landing page renders a centered `.landing-hero` panel (headline, description, Log In / Sign Up buttons, and a "Prediction service Online" pill) layered on top of an `EarthGlobe` scene that is itself confined to a `min(780px, 92vmin)` stage. The user wants the globe to fill the window edge-to-edge as the hero, the authentication entry point relocated to a top-right control so it never covers the globe, a more professional typography system, and the primitive-mesh orbiting satellite replaced with a realistic 3D satellite model. All existing backend integrations (auth, locations, passes, alerts, satellites) must continue to function exactly as they do today.

## Glossary

- **Globe_Hero_View**: The unauthenticated landing route (`/`) after this feature ships, in which the 3D Earth and orbiting satellite fill the browser viewport as the primary visual.
- **Landing_Hero_Card**: The existing `.landing-hero` glass panel containing the headline, description, primary Log In / Sign Up buttons, and the "Prediction service Online" readout. This card is removed by this feature.
- **Hero_Stage**: The full-bleed container that hosts the 3D Earth and satellite. It spans 100% of the viewport width and height and has no visible frame, border, or background card.
- **Earth_Globe_Scene**: The existing Three.js scene rendered by `frontend/src/components/3d/EarthGlobe.jsx` that draws the photorealistic textured Earth, atmospheric shader, and orbiting satellite.
- **Realistic_Satellite_Model**: A 3D satellite asset loaded from a model file (glTF/GLB) and rendered with PBR materials inside the Earth_Globe_Scene, replacing the current primitive-mesh satellite assembled from boxes and a cone.
- **Auth_Entry_Control**: The top-right UI region on `Globe_Hero_View` that exposes Log In and Sign Up as two distinct affordances (buttons or menu items). It never overlaps the horizontal or vertical center of the viewport.
- **Auth_Modal**: The existing `AuthModal` dialog (`frontend/src/features/auth/AuthModal.jsx`) that hosts the Login and Register forms; invoked by the Auth_Entry_Control.
- **Status_Indicator**: A compact readout that displays the operational status of the prediction backend (the data shown today as "Prediction service Online"). After this feature it is positioned in a subtle corner of the viewport so it does not overlap the globe's center.
- **Professional_Type_System**: The typography configuration (font families, weights, sizes, letter-spacing) applied site-wide that replaces the current default stack. It is chosen during the Design phase from a concrete shortlist proposed to the user.
- **Backend_API**: The existing FastAPI service exposed under `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) covering `/auth/*`, `/locations`, `/passes`, `/alerts`, `/satellites`.
- **Reduced_Motion_Mode**: The rendering mode entered when the user's OS reports `prefers-reduced-motion: reduce`, already handled by `useThreeScene` via the `prefersReducedMotion` flag.

## Requirements

### Requirement 1: Full-bleed globe hero

**User Story:** As a visitor landing on the app, I want the 3D Earth and its orbiting satellite to be the centerpiece of the window, so that the product's purpose is immediately obvious and visually impressive.

#### Acceptance Criteria

1. WHEN the unauthenticated user navigates to the `/` route, THE Globe_Hero_View SHALL render the Earth_Globe_Scene so that its canvas fills 100% of the viewport width and 100% of the viewport height.
2. THE Globe_Hero_View SHALL NOT render the Landing_Hero_Card or any other card, panel, frame, border, or background container around the Earth_Globe_Scene.
3. THE Earth_Globe_Scene SHALL be rendered with the Earth sphere centered horizontally and vertically in the viewport at all viewport sizes at or above 360px wide and 480px tall.
4. THE Hero_Stage SHALL be the topmost visual layer of the landing background, with only the Auth_Entry_Control and the Status_Indicator layered above it.
5. THE Earth_Globe_Scene SHALL size its canvas, update its camera aspect ratio, and keep the globe centered at all times, including on initial render and whenever the browser window is resized.
6. WHERE the user agent reports `prefers-reduced-motion: reduce`, THE Earth_Globe_Scene SHALL continue to render in Reduced_Motion_Mode as defined by the existing `useThreeScene` hook.
7. THE Hero_Stage SHALL NOT introduce horizontal page scrolling at viewport widths at or above 360px.

### Requirement 2: Auth entry relocated to top right

**User Story:** As a visitor who wants to sign in or create an account, I want the authentication controls accessible from the top right of the window, so that they don't cover the globe and feel like a standard app header.

#### Acceptance Criteria

1. THE Globe_Hero_View SHALL render the Auth_Entry_Control in the top-right region of the viewport, with its right edge within 32px of the viewport's right edge and its top edge within 32px of the viewport's top edge at viewport widths at or above 768px.
2. THE Auth_Entry_Control SHALL expose exactly two actions: "Log In" and "Sign Up".
3. WHEN the user activates the "Log In" action of the Auth_Entry_Control, THE Globe_Hero_View SHALL open the Auth_Modal with its initial mode set to `login`.
4. WHEN the user activates the "Sign Up" action of the Auth_Entry_Control, THE Globe_Hero_View SHALL open the Auth_Modal with its initial mode set to `register`.
5. THE Auth_Entry_Control SHALL NOT occupy the horizontal center third of the viewport nor the vertical center third of the viewport at any supported viewport size.
6. THE Globe_Hero_View SHALL NOT layer any UI element — including but not limited to primary Log In or Sign Up buttons, tagline cards, notifications, tooltips, or loading indicators — over the horizontal center third and vertical center third of the Earth_Globe_Scene.
7. WHERE the viewport width is below 768px, THE Auth_Entry_Control SHALL remain reachable in the top-right region and SHALL keep each action individually activatable (for example via a compact stacked layout or a two-item menu) without covering the center of the Earth_Globe_Scene.
8. THE Auth_Entry_Control SHALL be keyboard-focusable in source order before any decorative elements of the Hero_Stage and SHALL expose accessible names of "Log in" and "Sign up" (case-insensitive) to assistive technology.

### Requirement 3: Status indicator preserved without covering the globe

**User Story:** As a visitor, I want to still see that the prediction service is online, so that I have confidence the backend is working, without it covering the globe.

#### Acceptance Criteria

1. THE Globe_Hero_View SHALL render the Status_Indicator displaying the label "Prediction service" together with a status value.
2. THE Status_Indicator SHALL be positioned in a viewport corner other than the top-right corner occupied by the Auth_Entry_Control.
3. THE Status_Indicator SHALL NOT occupy the horizontal center third of the viewport nor the vertical center third of the viewport at any supported viewport size, regardless of backend reachability.
4. WHEN the Backend_API is reachable and healthy, THE Status_Indicator SHALL display the status value "Online".
5. IF the Backend_API is not reachable or is unhealthy, THEN THE Status_Indicator SHALL display a status value other than "Online" (for example "Offline") and SHALL NOT break the rendering of the Globe_Hero_View.
6. THE Status_Indicator SHALL expose its current status value as text to assistive technology.

### Requirement 4: Realistic 3D satellite in orbit

**User Story:** As a visitor, I want the satellite orbiting the globe to look like a realistic spacecraft, so that the scene feels authentic and premium.

#### Acceptance Criteria

1. THE Earth_Globe_Scene SHALL render a Realistic_Satellite_Model as the satellite orbiting the Earth sphere, in place of the current primitive-mesh satellite composed of box bodies, box solar panels, and a cone dish.
2. THE Realistic_Satellite_Model SHALL be loaded from a 3D model asset in glTF or GLB format bundled with the frontend under `frontend/public/` (or an equivalent static-asset path served by Vite).
3. THE Realistic_Satellite_Model SHALL render with physically based rendering (PBR) materials, including at minimum a non-flat body, distinguishable solar panels, and one antenna or dish element.
4. WHILE the Earth_Globe_Scene is animating, THE Realistic_Satellite_Model SHALL follow the same inclined orbital path around the Earth sphere as the current satellite, with the same orbital radius, inclination, and direction of travel.
5. THE Realistic_Satellite_Model SHALL be scaled so that its longest dimension projects to no more than 12% of the Earth sphere's on-screen diameter and no less than 3% of that diameter.
6. WHERE `prefers-reduced-motion: reduce` is set, THE Realistic_Satellite_Model SHALL use the reduced orbital and self-rotation speeds already defined for the scene in Reduced_Motion_Mode.
7. IF loading the Realistic_Satellite_Model asset fails, THEN THE Earth_Globe_Scene SHALL render the Earth sphere and atmosphere without a satellite and SHALL NOT throw an unhandled error.
8. IF any other error occurs inside the Earth_Globe_Scene during setup, animation, or rendering (including texture loads, shader compilation, or WebGL context loss), THEN THE Earth_Globe_Scene SHALL handle the error internally and SHALL NOT surface an unhandled exception or unhandled promise rejection to the application.
9. WHEN the Earth_Globe_Scene component unmounts, THE Realistic_Satellite_Model SHALL have its geometries, materials, and textures disposed through the existing disposal path in `useThreeScene`.

### Requirement 5: Professional typography system

**User Story:** As a visitor, I want the app's text to look refined and professional, so that it feels like a serious product and not a hobby project.

#### Acceptance Criteria

1. THE Globe_Hero_View SHALL render all user-visible text using the Professional_Type_System chosen during the Design phase.
2. THE Professional_Type_System SHALL define at minimum a display font family for headings and a body font family for prose and UI controls.
3. THE Professional_Type_System SHALL NOT use the current default `Inter, ui-sans-serif, system-ui, ...` stack defined in `frontend/src/styles.css` as its display face unless that face is explicitly re-selected during design review.
4. THE Professional_Type_System SHALL be applied site-wide through the root CSS so that authenticated pages (Dashboard, Locations, Alerts) inherit the same typography as the Globe_Hero_View.
5. THE Professional_Type_System SHALL be loaded in a way that avoids a flash of unstyled text longer than 300ms on a warm cache, for example via `<link rel="preconnect">` to the font host or self-hosted font files with `font-display: swap`.
6. THE Professional_Type_System SHALL include weights sufficient to render the existing visual hierarchy: at minimum a regular weight (around 400), a medium or semibold weight (around 500 or 600), and a bold weight (around 700).
7. WHERE a user's browser cannot load the chosen web fonts, THE Professional_Type_System SHALL fall back to a system font stack whose metrics preserve readability (legible x-height, system-native weights, no decorative or display-only faces), regardless of how quickly the primary fonts load.

### Requirement 6: Backend integration preserved

**User Story:** As a returning user, I want every existing API call to keep working after the visual rework, so that authentication, locations, passes, and alerts all behave exactly as before.

#### Acceptance Criteria

1. THE Globe_Hero_View SHALL invoke the Backend_API `/auth/login` endpoint through the existing `loginUser` client function when the user submits the login form from the Auth_Modal.
2. THE Globe_Hero_View SHALL invoke the Backend_API `/auth/register` endpoint through the existing `registerUser` client function when the user submits the register form from the Auth_Modal.
3. WHEN a user successfully authenticates from the Auth_Modal, THE Globe_Hero_View SHALL navigate the user to `/dashboard` using the same routing behavior currently triggered by `isAuthenticated` in `Landing.jsx`.
4. IF the post-authentication navigation to `/dashboard` fails or is blocked, THEN THE Globe_Hero_View SHALL invoke `clearAuth` on the existing `AuthContext` so that the session is rolled back and the user is not left in a partially authenticated state.
5. THE feature SHALL NOT remove, rename, or change the request or response contracts of the functions exported from `frontend/src/api/client.js`.
6. THE feature SHALL NOT modify any file under `backend/`.
7. WHEN the authenticated user is on `/dashboard`, `/locations/:locationId`, or `/alerts`, THE feature SHALL continue to invoke the same `fetchLocations`, `fetchPasses`, `fetchPassStats`, `fetchSatellites`, `fetchAlerts`, `fetchAlertHistory`, and `fetchAlertStats` functions as before, with unchanged parameters.
8. IF the Backend_API returns a 401 response to an authenticated request, THEN the feature SHALL continue to rely on the existing refresh-token interceptor in `frontend/src/api/client.js` to refresh the session, without bypassing or duplicating that logic.
9. THE feature SHALL preserve the existing `AuthContext` provider contract (`auth`, `user`, `isAuthenticated`, `login`, `register`, `logout`, `clearAuth`) without removing or renaming any of its exported values.

### Requirement 7: Visual language continuity

**User Story:** As the product owner, I want the dark space aesthetic and overall polish to carry over, so that what I already like about the app stays intact.

#### Acceptance Criteria

1. THE Globe_Hero_View SHALL retain the dark background treatment currently produced by the body gradient and the `Starfield` component, without introducing a light-themed background on the landing route.
2. THE Globe_Hero_View SHALL retain the atmospheric glow shader currently rendered around the Earth sphere in the Earth_Globe_Scene.
3. THE Auth_Entry_Control SHALL visually match the existing button vocabulary (pill-shaped, dark translucent fill, subtle inner border, mint or cyan accent) used elsewhere in the frontend.
4. THE Status_Indicator SHALL retain the exact semantic content "Prediction service" paired with an operational status value, presented in the same compact pill idiom currently used by `.signal-readout`.
5. THE Globe_Hero_View SHALL continue to animate its entrance using an opacity and subtle-transform fade, consistent with the current `framer-motion` usage, unless `prefers-reduced-motion: reduce` is set, in which case the transition SHALL be instantaneous per the existing reduced-motion CSS.

### Requirement 8: Accessibility and non-regression

**User Story:** As a user who relies on assistive technology or keyboard navigation, I want the new hero to remain usable, so that the redesign does not lock me out.

#### Acceptance Criteria

1. THE Globe_Hero_View SHALL expose one `<main>` landmark containing the unauthenticated page content.
2. THE Earth_Globe_Scene canvas SHALL be marked `aria-hidden="true"` so screen readers do not announce the decorative 3D scene, consistent with the existing `SceneContainer` behavior.
3. WHEN the Auth_Modal is open, THE Globe_Hero_View SHALL trap focus within the modal and SHALL close on `Escape`, consistent with the existing behavior in `AuthModal.jsx`.
4. THE Auth_Entry_Control SHALL be reachable via keyboard in the tab order before the decorative Hero_Stage contents.
5. THE Globe_Hero_View SHALL target a WCAG AA contrast ratio for all text rendered over the globe background, including the Auth_Entry_Control labels and the Status_Indicator text. WHERE runtime contrast calculation is unavailable or fails, THE Globe_Hero_View SHALL still render the text using its designed styles rather than suppressing the text.
6. THE Globe_Hero_View SHALL render without console errors or uncaught promise rejections when the Backend_API is unreachable.
