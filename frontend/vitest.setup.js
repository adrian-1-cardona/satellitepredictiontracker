// Vitest setup file for the globe-hero-ui feature test suite.
//
// Each polyfill/stub below exists to support a specific Property or unit test
// that would otherwise crash or misbehave under jsdom. Keep the comment headers
// accurate if you edit this file — test authors rely on them when diagnosing
// environment issues.
//
// Polyfills / stubs registered here:
//
//   1. @testing-library/jest-dom matchers
//      - Adds DOM-aware matchers (toBeInTheDocument, toHaveAccessibleName, …)
//        used by EarthGlobe unit tests, TopRightAuthBar unit tests, and
//        StatusIndicator unit tests.
//
//   2. ResizeObserver polyfill
//      - jsdom has no ResizeObserver. useThreeScene observes its mount
//        container to keep the renderer sized to the viewport. Property 1
//        (full-bleed canvas + camera aspect) depends on this existing.
//
//   3. matchMedia stub
//      - jsdom does not implement matchMedia. EarthGlobe queries
//        `(prefers-reduced-motion: reduce)` at mount time to decide the
//        reduced-motion orbit speeds. EarthGlobe unit tests also spy on this.
//
//   4. getBoundingClientRect polyfill driven by inline / fixed-position styles
//      - jsdom returns a zero rect for every element, which makes Property 3
//        (center-third chrome exclusion) untestable. This polyfill reads the
//        element's inline / computed style, and when the element is
//        `position: fixed` with px-valued top/right/bottom/left/width/height,
//        synthesises a realistic rect from `window.innerWidth`/`innerHeight`.
//        Used by Property 3 (chrome-exclusion) and indirectly by Property 1
//        when asserting canvas.clientWidth/Height.
//
//   5. WebGLRenderingContext no-op stub on HTMLCanvasElement.getContext
//      - jsdom returns null from canvas.getContext("webgl"), which causes
//        three.js's WebGLRenderer constructor to throw and aborts the whole
//        test. This stub returns a Proxy that implements enough of the WebGL
//        surface for WebGLRenderer to construct successfully; actual drawing
//        is a no-op. Real 2D contexts ("2d", "bitmaprenderer", …) still go
//        through the native implementation. Most tests mock useThreeScene or
//        GLTFLoader to avoid this path entirely; this stub is a safety net
//        for tests that mount EarthGlobe without mocking the hook.
//        Supports Property 6 (scene error containment) and EarthGlobe unit
//        tests.

import "@testing-library/jest-dom/vitest";
import React from "react";
import ResizeObserverPolyfill from "resize-observer-polyfill";

// Keep JSX deterministic across Vitest/Vite transformer paths. Most files use
// the automatic runtime, but a global React binding also lets any classic JSX
// transform path run without forcing every test file to import React.
globalThis.React = React;

// --- 2. ResizeObserver --------------------------------------------------------
if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill;
}
globalThis.ResizeObserver = window.ResizeObserver;

// --- 3. matchMedia (prefers-reduced-motion) ----------------------------------
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// --- 4. getBoundingClientRect polyfill ---------------------------------------
// Property 3 (chrome center-third exclusion) reads geometry from fixed-position
// elements with top/right/bottom/left + width/height expressed in px; jsdom
// returns a zero rect by default. This polyfill parses styles from the element
// (inline first, then getComputedStyle) and synthesises a realistic rect when
// the element is position: fixed. It falls back to the default rect for any
// other element.
const originalGetBoundingClientRect =
  HTMLElement.prototype.getBoundingClientRect;

function parsePx(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  return m ? parseFloat(m[1]) : null;
}

function computedStyleOr(el, prop) {
  const inline = el.style?.[prop];
  if (inline) return inline;
  try {
    const cs = window.getComputedStyle(el);
    return cs.getPropertyValue(prop) || cs[prop] || "";
  } catch {
    return "";
  }
}

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  const position = computedStyleOr(this, "position");
  if (position === "fixed") {
    const topPx = parsePx(computedStyleOr(this, "top"));
    const rightPx = parsePx(computedStyleOr(this, "right"));
    const bottomPx = parsePx(computedStyleOr(this, "bottom"));
    const leftPx = parsePx(computedStyleOr(this, "left"));
    const widthPx = parsePx(computedStyleOr(this, "width"));
    const heightPx = parsePx(computedStyleOr(this, "height"));
    const width = widthPx ?? 200; // best-effort intrinsic width
    const height = heightPx ?? 44;
    let left = leftPx;
    let top = topPx;
    if (left == null && rightPx != null) left = w - rightPx - width;
    if (top == null && bottomPx != null) top = h - bottomPx - height;
    left ??= 0;
    top ??= 0;
    return {
      x: left,
      y: top,
      top,
      left,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON() {
        return this;
      },
    };
  }
  return originalGetBoundingClientRect.call(this);
};

// --- 5. WebGLRenderingContext no-op stub -------------------------------------
// jsdom returns null from canvas.getContext('webgl'), which causes three's
// WebGLRenderer constructor to throw. We patch getContext to return a sparse
// Proxy that implements just enough of the WebGL surface for WebGLRenderer to
// construct without crashing; actual rendering is a no-op. 2D contexts still
// go through the native implementation so existing canvas-2D tests keep
// working.
const nativeGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
  if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
    return new Proxy(
      {
        canvas: this,
        drawingBufferWidth: this.width || 1,
        drawingBufferHeight: this.height || 1,
      },
      {
        get(target, prop) {
          if (prop in target) return target[prop];
          // Return a function for any method access so three's internal calls
          // (e.g. gl.getParameter(...), gl.createBuffer(), …) don't blow up.
          return (..._args) => {
            // Methods that are expected to return a non-null object handle.
            if (
              prop === "createBuffer" ||
              prop === "createTexture" ||
              prop === "createFramebuffer" ||
              prop === "createRenderbuffer" ||
              prop === "createShader" ||
              prop === "createProgram" ||
              prop === "createVertexArray"
            ) {
              return {};
            }
            // Methods that must return a numeric/enum-like value.
            if (
              prop === "getParameter" ||
              prop === "getShaderParameter" ||
              prop === "getProgramParameter" ||
              prop === "checkFramebufferStatus" ||
              prop === "getError"
            ) {
              return 0;
            }
            if (prop === "getExtension" || prop === "getSupportedExtensions") {
              return null;
            }
            return undefined;
          };
        },
      },
    );
  }
  return nativeGetContext.call(this, type, ...rest);
};
