import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { usePageTracking } from "@/hooks/usePageTracking";

vi.mock("@/services", () => ({
  analyticsService: { track: vi.fn() },
}));

import { analyticsService } from "@/services";

const renderAt = (path: string) =>
  renderHook(() => usePageTracking(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    ),
  });

describe("usePageTracking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tracks page_view for /he/daily", () => {
    renderAt("/he/daily");
    expect(analyticsService.track).toHaveBeenCalledWith({
      name: "page_view",
      params: { page_path: "/he/daily", lang: "he" },
    });
  });

  it("tracks page_view for /en/monthly", () => {
    renderAt("/en/monthly");
    expect(analyticsService.track).toHaveBeenCalledWith({
      name: "page_view",
      params: { page_path: "/en/monthly", lang: "en" },
    });
  });

  it("does not track when pathname is root /", () => {
    renderAt("/");
    expect(analyticsService.track).not.toHaveBeenCalled();
  });

  it("does not track when lang is unknown", () => {
    renderAt("/fr/daily");
    expect(analyticsService.track).not.toHaveBeenCalled();
  });
});
