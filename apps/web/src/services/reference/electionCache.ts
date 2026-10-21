import type { PublishedElection } from "./reference.service";

/** The last successful API answer for a year. An empty list is an answer. */
export interface CachedElections {
  year: number;
  elections: PublishedElection[];
  /** ISO timestamp of the successful response. */
  fetchedAt: string;
}

// localStorage: published reference data, not user data, so it may outlive
// the tab and serve as last-known-good when the API is unreachable.
const keyFor = (year: number) => `shiftly:published-elections:v1:${year}`;

const STATUSES: readonly string[] = ["planned", "confirmed", "occurred"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isElection = (value: unknown): value is PublishedElection =>
  isRecord(value) &&
  Number.isInteger(value.knessetNumber) &&
  (value.knessetNumber as number) > 0 &&
  typeof value.date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
  typeof value.status === "string" &&
  STATUSES.includes(value.status);

const isCachedElections = (
  value: unknown,
  year: number,
): value is CachedElections =>
  isRecord(value) &&
  value.year === year &&
  typeof value.fetchedAt === "string" &&
  !Number.isNaN(Date.parse(value.fetchedAt)) &&
  Array.isArray(value.elections) &&
  value.elections.every(isElection);

/** Storage can be unavailable (private mode, quota); the cache is best effort. */
export const electionCache = {
  read(year: number): CachedElections | null {
    try {
      const raw = localStorage.getItem(keyFor(year));
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return isCachedElections(parsed, year) ? parsed : null;
    } catch {
      return null;
    }
  },

  write(entry: CachedElections): void {
    try {
      localStorage.setItem(keyFor(entry.year), JSON.stringify(entry));
    } catch {
      // Without storage, the next failure simply has no last-known-good data.
    }
  },
};
