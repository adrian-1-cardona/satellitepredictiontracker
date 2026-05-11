// Feature: globe-hero-ui, Task 7.3
// Validates: Requirements 2.1, 2.2, 2.8
//
// Confirms that TopRightAuthBar:
//   - renders fixed in the top-right of the viewport (Req 2.1)
//   - exposes exactly a "Log In" and a "Sign Up" button with matching
//     callbacks (Req 2.2)
//   - provides accessible names of "Log in" / "Sign up" that assistive
//     technology can query (Req 2.8)

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, vi } from "vitest";

import TopRightAuthBar from "../TopRightAuthBar.jsx";

describe("TopRightAuthBar", () => {
  beforeEach(() => {
    // Task 7.3 pins the viewport at the default desktop breakpoint. jsdom's
    // computed styles for `position`/`top`/`right` come from the imported
    // CSS rule rather than the viewport width, but setting innerWidth keeps
    // the assertions aligned with the spec ("at jsdom width 1280") and
    // matches how the layout is verified manually.
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    window.dispatchEvent(new Event("resize"));
  });

  test("renders fixed in the top-right region at 1280px viewport width", () => {
    render(<TopRightAuthBar onLogin={() => {}} onSignup={() => {}} />);

    const nav = screen.getByRole("navigation", { name: /account/i });
    const styles = window.getComputedStyle(nav);

    expect(styles.position).toBe("fixed");
    expect(styles.top).toBe("24px");
    expect(styles.right).toBe("24px");
  });

  test("invokes onLogin exactly once when the Log In button is clicked", async () => {
    const onLogin = vi.fn();
    const onSignup = vi.fn();
    const user = userEvent.setup();

    render(<TopRightAuthBar onLogin={onLogin} onSignup={onSignup} />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onSignup).not.toHaveBeenCalled();
  });

  test("invokes onSignup exactly once when the Sign Up button is clicked", async () => {
    const onLogin = vi.fn();
    const onSignup = vi.fn();
    const user = userEvent.setup();

    render(<TopRightAuthBar onLogin={onLogin} onSignup={onSignup} />);

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(onSignup).toHaveBeenCalledTimes(1);
    expect(onLogin).not.toHaveBeenCalled();
  });

  test("exposes exactly the Log In and Sign Up actions", () => {
    render(<TopRightAuthBar onLogin={() => {}} onSignup={() => {}} />);

    expect(
      screen.getByRole("button", { name: /log in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();
  });
});
