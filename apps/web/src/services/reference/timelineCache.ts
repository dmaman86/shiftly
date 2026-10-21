import {
  isPublishedTimelines,
  type PublishedTimelines,
} from "./reference.service";

/** The last valid API answer for the rate timelines. */
export interface CachedTimelines {
  timelines: PublishedTimelines;
  /** ISO timestamp of the successful response. */
  fetchedAt: string;
}

// localStorage: published reference data, not user data, so it may outlive
// the tab and serve as last-known-good when the API is unreachable.
const KEY = "shiftly:reference-timelines:v1";

const isCachedTimelines = (value: unknown): value is CachedTimelines =>
  typeof value === "object" &&
  value !== null &&
  "fetchedAt" in value &&
  typeof value.fetchedAt === "string" &&
  !Number.isNaN(Date.parse(value.fetchedAt)) &&
  "timelines" in value &&
  isPublishedTimelines(value.timelines);

/** Storage can be unavailable (private mode, quota); the cache is best effort. */
export const timelineCache = {
  read(): CachedTimelines | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return isCachedTimelines(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  write(entry: CachedTimelines): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(entry));
    } catch {
      // Without storage, the next failure falls back to the embedded baseline.
    }
  },
};
