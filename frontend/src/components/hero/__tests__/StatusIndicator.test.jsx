// Feature: globe-hero-ui — unit tests for StatusIndicator
// Validates: Requirements 3.1, 3.4, 3.5, 3.6, 8.6

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// vi.mock is hoisted, so the imported `api.head` below is the mock.
vi.mock("../../../api/client.js", () => ({
  api: { head: vi.fn() },
}));

import { api } from "../../../api/client.js";
import StatusIndicator from "../StatusIndicator.jsx";

describe("StatusIndicator", () => {
  beforeEach(() => {
    api.head.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders Online when the probe resolves with 200 (Req 3.4)", async () => {
    api.head.mockResolvedValueOnce({ status: 200 });

    render(<StatusIndicator />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/online/i);
    });

    expect(screen.getByRole("status")).not.toHaveTextContent(/checking/i);
    expect(api.head).toHaveBeenCalledWith(
      "/",
      expect.objectContaining({ timeout: 2500 }),
    );
  });

  test("renders Offline when the probe fails with ERR_NETWORK (Req 3.5)", async () => {
    api.head.mockRejectedValueOnce({
      code: "ERR_NETWORK",
      message: "Network Error",
    });

    render(<StatusIndicator />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/offline/i);
    });
  });

  test("renders Online when the server returns an HTTP error response (Req 3.6)", async () => {
    // A 500 response means the server is reachable, so the status pill
    // should show Online even though the promise rejected.
    api.head.mockRejectedValueOnce({ response: { status: 500 } });

    render(<StatusIndicator />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/online/i);
    });
  });

  test("exposes role='status' and aria-live='polite' (Req 3.1, 8.6)", async () => {
    api.head.mockResolvedValueOnce({ status: 200 });

    render(<StatusIndicator />);

    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-live", "polite");

    await waitFor(() => {
      expect(el).toHaveTextContent(/online/i);
    });
  });

  test("aborts the in-flight probe on unmount (Req 3.6)", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    // Leave the probe pending so the abort path is the only way out.
    api.head.mockImplementationOnce(() => new Promise(() => {}));

    try {
      const { unmount } = render(<StatusIndicator />);
      unmount();
      expect(abortSpy).toHaveBeenCalled();
    } finally {
      abortSpy.mockRestore();
    }
  });
});
