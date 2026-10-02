import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonthlyContentBoundary } from "@/features/monthly-data/MonthlyContentBoundary";
import { MonthlyConfigStatusContext } from "@/features/monthly-data/monthlyConfigStatusContext";
import { useState } from "react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MonthlyContentBoundary", () => {
  it("reserves the last measured height through config and calendar loading", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(0, 0, 900, 1400));
    const view = (ready: boolean, loading = false) => (
      <MonthlyConfigStatusContext.Provider value={{ ready, contextKey: "month" }}>
        <MonthlyContentBoundary loading={loading} minHeight={600}>
          <p>Monthly values</p>
        </MonthlyContentBoundary>
      </MonthlyConfigStatusContext.Provider>
    );
    const { container, rerender } = render(view(true));
    rerender(view(false));
    expect(container.firstChild).toHaveStyle({ minHeight: "1400px" });
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Monthly values")).not.toBeInTheDocument();
    rerender(view(true, true));
    expect(container.firstChild).toHaveStyle({ minHeight: "1400px" });
    rerender(view(true));
    expect(container.firstChild).toHaveAttribute("aria-busy", "false");
    expect(container.firstChild).not.toHaveStyle({ minHeight: "1400px" });
    expect(screen.getByText("Monthly values")).toBeVisible();
  });

  it("resets only monthly content when the identity changes", () => {
    const Counter = () => {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount(count + 1)}>{count}</button>;
    };
    const view = (contextKey: string) => (
      <MonthlyConfigStatusContext.Provider value={{ ready: true, contextKey }}>
        <MonthlyContentBoundary><Counter /></MonthlyContentBoundary>
      </MonthlyConfigStatusContext.Provider>
    );
    const { rerender } = render(view("month-a"));
    act(() => screen.getByRole("button", { name: "0" }).click());
    expect(screen.getByRole("button", { name: "1" })).toBeVisible();
    rerender(view("month-b"));
    expect(screen.getByRole("button", { name: "0" })).toBeVisible();
  });
});
