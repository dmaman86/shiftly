import type { AnalyticsEvent } from "./events";

export const analyticsService = {
  track(event: AnalyticsEvent): void {
    if (typeof window === "undefined" || typeof window.gtag !== "function")
      return;
    window.gtag("event", event.name, event.params);
  },
};
