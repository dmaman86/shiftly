import type { AnalyticsEvent } from "./events";
import { toAnalyticsPageLocation } from "./pageLocation";

export const analyticsService = {
  track(event: AnalyticsEvent): void {
    if (typeof window === "undefined" || typeof window.gtag !== "function")
      return;
    // Set explicitly on every hit: events fired while an OAuth callback is
    // still in the URL would otherwise report it as the page location.
    window.gtag("event", event.name, {
      ...event.params,
      page_location: toAnalyticsPageLocation(window.location.href),
    });
  },
};
