import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import Dashboard from "../Dashboard.jsx";
import Alerts from "../Alerts.jsx";
import LocationDetail from "../LocationDetail.jsx";

expect.extend(toHaveNoViolations);

vi.mock("../../features/locations/LocationMap.jsx", () => ({
  default: () => (
    <section className="map-panel" aria-label="Interactive satellite tracking globe">
      <div>Mock globe</div>
    </section>
  ),
}));

vi.mock("../../api/client.js", () => ({
  createAlert: vi.fn().mockResolvedValue({ id: 1 }),
  createLocation: vi.fn().mockResolvedValue({
    id: 2,
    name: "Mock Observatory",
    latitude: 34.05,
    longitude: -118.25,
    elevation_m: 90,
  }),
  deleteAlert: vi.fn().mockResolvedValue({}),
  fetchAlertHistory: vi.fn().mockResolvedValue({
    data: [
      {
        id: 11,
        alert_id: 1,
        pass_id: 9,
        delivery_status: "delivered",
        delivered_at: "2026-05-10T12:00:00Z",
        message: "Pass alert delivered",
      },
    ],
    count: 1,
    skip: 0,
    limit: 50,
  }),
  fetchAlerts: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        location_id: 1,
        satellite_name: "ISS (ZARYA)",
        min_elevation: 20,
        max_brightness: null,
        enabled: true,
      },
    ],
    count: 1,
    skip: 0,
    limit: 50,
  }),
  fetchLocation: vi.fn().mockResolvedValue({
    id: 1,
    name: "Mock Observatory",
    latitude: 34.05,
    longitude: -118.25,
    elevation_m: 90,
  }),
  fetchLocations: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        name: "Mock Observatory",
        latitude: 34.05,
        longitude: -118.25,
        elevation_m: 90,
      },
    ],
    count: 1,
    skip: 0,
    limit: 50,
  }),
  fetchPasses: vi.fn().mockResolvedValue({
    data: [
      {
        id: 101,
        satellite_name: "ISS (ZARYA)",
        rise_time: "2026-05-10T12:00:00Z",
        culmination_time: "2026-05-10T12:04:00Z",
        set_time: "2026-05-10T12:08:00Z",
        max_elevation: 62,
        brightness: -2.1,
        pass_quality: "excellent",
      },
    ],
    count: 1,
    skip: 0,
    limit: 50,
  }),
  getErrorMessage: (err, fallback = "Something went wrong.") =>
    err?.message || fallback,
  refreshPasses: vi.fn().mockResolvedValue({ message: "Pass refresh queued." }),
  updateAlert: vi.fn((id, patch) =>
    Promise.resolve({
      id,
      location_id: 1,
      satellite_name: "ISS (ZARYA)",
      min_elevation: 20,
      max_brightness: null,
      enabled: patch.enabled,
    }),
  ),
}));

afterEach(() => {
  cleanup();
});

const axeOptions = {
  rules: { "color-contrast": { enabled: false } },
};

async function expectNoA11yViolations(ui, readyText) {
  const { container } = render(ui);
  await screen.findByText(readyText);
  await waitFor(async () => {
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });
}

test("Dashboard has no axe violations with loaded data", async () => {
  await expectNoA11yViolations(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
    "Saved Locations",
  );
});

test("Alerts has no axe violations with loaded data", async () => {
  await expectNoA11yViolations(
    <MemoryRouter>
      <Alerts />
    </MemoryRouter>,
    "Active Alerts",
  );
});

test("LocationDetail has no axe violations with loaded data", async () => {
  await expectNoA11yViolations(
    <MemoryRouter initialEntries={["/locations/1"]}>
      <Routes>
        <Route path="/locations/:locationId" element={<LocationDetail />} />
      </Routes>
    </MemoryRouter>,
    "Satellite Passes",
  );
});
