import { test, expect, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render } from "@testing-library/react";

import { AuthProvider, useAuth } from "../../auth/AuthContext.jsx";

/**
 * Property 7: Backend and auth contracts are preserved by exports.
 *
 * For every (moduleName, exportName, arity) tuple in the baseline contract
 * list below, the corresponding export must exist on the current module,
 * must be `typeof "function"`, and must report `.length === arity`.
 *
 * Note on arities: JavaScript's `Function.prototype.length` does not count
 * parameters with default values or rest parameters, so entries like
 * `getErrorMessage(error, fallback = "...")` report `.length === 1`. The
 * expected `.length` is encoded per-entry below.
 *
 * Validates: Requirements 6.5, 6.7, 6.9
 */
const CONTRACT_TUPLES = [
  // api/client.js — auth
  { moduleName: "api/client", exportName: "registerUser", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "loginUser", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "logoutUser", arity: 0, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "fetchCurrentUser", arity: 0, importPath: "../client.js" },

  // api/client.js — locations
  { moduleName: "api/client", exportName: "fetchLocations", arity: 0, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "fetchLocation", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "createLocation", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "updateLocation", arity: 2, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "deleteLocation", arity: 1, importPath: "../client.js" },

  // api/client.js — passes
  // fetchPasses takes a single destructured options object, so .length === 1.
  { moduleName: "api/client", exportName: "fetchPasses", arity: 1, importPath: "../client.js" },
  // refreshPasses(locationId, daysAhead = 12) — default-valued params do not
  // contribute to Function.length, so .length === 1.
  { moduleName: "api/client", exportName: "refreshPasses", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "fetchPass", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "fetchPassStats", arity: 0, importPath: "../client.js" },

  // api/client.js — satellites
  // fetchSatellites(limit = 100) — default-valued param, .length === 0.
  { moduleName: "api/client", exportName: "fetchSatellites", arity: 0, importPath: "../client.js" },

  // api/client.js — alerts
  { moduleName: "api/client", exportName: "fetchAlerts", arity: 0, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "createAlert", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "updateAlert", arity: 2, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "deleteAlert", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "fetchAlert", arity: 1, importPath: "../client.js" },
  // fetchAlertHistory(days = 7) — default-valued param, .length === 0.
  { moduleName: "api/client", exportName: "fetchAlertHistory", arity: 0, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "fetchAlertStats", arity: 0, importPath: "../client.js" },

  // api/client.js — helpers
  // getErrorMessage(error, fallback = "Something went wrong.") — default-valued
  // second param, so .length === 1 (counts required params before first default).
  { moduleName: "api/client", exportName: "getErrorMessage", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "getStoredAuth", arity: 0, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "persistAuth", arity: 1, importPath: "../client.js" },
  { moduleName: "api/client", exportName: "clearStoredAuth", arity: 0, importPath: "../client.js" },
];

beforeEach(() => {
  // Guard against pre-existing auth leaking into the AuthProvider render.
  try {
    window.localStorage.clear();
  } catch {
    // jsdom always provides localStorage; this catch is defensive.
  }
});

test("Property 7: every baseline api/client export exists with the expected arity", async () => {
  await fc.assert(
    fc.asyncProperty(fc.constantFrom(...CONTRACT_TUPLES), async (tuple) => {
      const mod = await import(/* @vite-ignore */ tuple.importPath);
      const value = mod[tuple.exportName];

      expect(
        typeof value,
        `${tuple.moduleName}#${tuple.exportName} must be a function`,
      ).toBe("function");

      expect(
        value.length,
        `${tuple.moduleName}#${tuple.exportName} expected arity ${tuple.arity}`,
      ).toBe(tuple.arity);
    }),
    { numRuns: 100 },
  );
});

test("Property 7: AuthProvider value exposes the documented auth context shape", () => {
  let capturedValue = null;

  function Consumer() {
    capturedValue = useAuth();
    return null;
  }

  render(React.createElement(AuthProvider, null, React.createElement(Consumer)));

  expect(capturedValue).not.toBeNull();

  // Keys defined by the contract:
  //   { auth, user, isAuthenticated, login, register, logout, clearAuth }
  expect(capturedValue).toHaveProperty("auth");
  expect(capturedValue).toHaveProperty("user");
  expect(capturedValue).toHaveProperty("isAuthenticated");
  expect(capturedValue).toHaveProperty("login");
  expect(capturedValue).toHaveProperty("register");
  expect(capturedValue).toHaveProperty("logout");
  expect(capturedValue).toHaveProperty("clearAuth");

  // The four action props must be functions.
  expect(typeof capturedValue.login).toBe("function");
  expect(typeof capturedValue.register).toBe("function");
  expect(typeof capturedValue.logout).toBe("function");
  expect(typeof capturedValue.clearAuth).toBe("function");
});
