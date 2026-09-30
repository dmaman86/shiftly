import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsService } from "@/services/analytics/analytics.service";

describe("analyticsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not throw when gtag is not defined", () => {
    expect(() =>
      analyticsService.track({
        name: "page_view",
        params: { page_path: "/he/daily", lang: "he" },
      }),
    ).not.toThrow();
  });

  it("calls window.gtag with event name and params", () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);

    analyticsService.track({
      name: "page_view",
      params: { page_path: "/he/daily", lang: "he" },
    });

    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/he/daily",
      lang: "he",
    });

    vi.unstubAllGlobals();
  });
});
