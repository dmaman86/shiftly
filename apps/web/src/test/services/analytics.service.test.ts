import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyticsService } from "@/services/analytics/analytics.service";

const PAGE_URL = "https://dmaman86.github.io/shiftly/he/daily";

describe("analyticsService", () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(() => vi.unstubAllGlobals());

  it("does not throw when gtag is not defined", () => {
    expect(() =>
      analyticsService.track({
        name: "page_view",
        params: { page_path: "/he/daily", lang: "he" },
      }),
    ).not.toThrow();
  });

  it("calls window.gtag with event name, params and page location", () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);
    vi.stubGlobal("location", new URL(PAGE_URL));

    analyticsService.track({
      name: "page_view",
      params: { page_path: "/he/daily", lang: "he" },
    });

    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/he/daily",
      lang: "he",
      page_location: PAGE_URL,
    });
  });

  it("strips OAuth callback tokens from the page location", () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);
    vi.stubGlobal(
      "location",
      new URL(`${PAGE_URL}#access_token=secret&refresh_token=secret`),
    );

    analyticsService.track({
      name: "page_view",
      params: { page_path: "/he/daily", lang: "he" },
    });

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "page_view",
      expect.objectContaining({ page_location: PAGE_URL }),
    );
  });
});
