import { electionCache } from "./electionCache";
import { referenceService, type PublishedElection } from "./reference.service";

/**
 * Where a year's election days came from. Never collapses a failure into an
 * empty list: "missing" means the days are unknown, not that there are none.
 */
export type YearElectionDays =
  | { status: "fresh"; year: number; elections: PublishedElection[] }
  | {
      status: "stale";
      year: number;
      elections: PublishedElection[];
      fetchedAt: string;
      reason: string;
    }
  | { status: "missing"; year: number; reason: string };

const referenceApi = referenceService();

/**
 * Asks the API; on success remembers the answer as last-known-good. When the
 * API cannot be used, falls back to that remembered answer. Client errors and
 * contract violations still throw: they are bugs, not outages.
 */
export const loadElectionDays = async (
  year: number,
  now: () => Date = () => new Date(),
): Promise<YearElectionDays> => {
  const result = await referenceApi.getElections(year);
  if (result.source === "api") {
    electionCache.write({
      year,
      elections: result.elections,
      fetchedAt: now().toISOString(),
    });
    return { status: "fresh", year, elections: result.elections };
  }

  const cached = electionCache.read(year);
  return cached
    ? {
        status: "stale",
        year,
        elections: cached.elections,
        fetchedAt: cached.fetchedAt,
        reason: result.reason,
      }
    : { status: "missing", year, reason: result.reason };
};
