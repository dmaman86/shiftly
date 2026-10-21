/**
 * The public, read-only view of timeline reference values (rates that change
 * over time). Only active revisions without a subject are published, mapped
 * to this DTO: ids, trust, sources, evidence and review state never leave the
 * reader.
 */

/** Timeline kinds the web app calculates with; anything else is a 400. */
export const PUBLISHED_TIMELINE_KINDS = [
  "per_diem.point_rate",
  "meal_allowance.rates",
] as const;

export type PublishedTimelineKind = (typeof PUBLISHED_TIMELINE_KINDS)[number];

export type PublishedTimelineValues = {
  /** Amount of one per-diem point, in shekels. */
  readonly "per_diem.point_rate": { readonly amount: number };
  readonly "meal_allowance.rates": {
    readonly small: number;
    readonly large: number;
  };
};

/** One published value; it applies on [validFrom, validTo). */
export type PublishedTimelineEntry<V> = {
  /** YYYY-MM-DD, inclusive. */
  readonly validFrom: string;
  /** YYYY-MM-DD, exclusive; null when the value has no end yet. */
  readonly validTo: string | null;
  readonly value: V;
};

export type PublishedTimelines = {
  readonly [K in PublishedTimelineKind]: readonly PublishedTimelineEntry<
    PublishedTimelineValues[K]
  >[];
};

export interface PublishedTimelinesReader {
  /** Every published kind, each ordered by validFrom and already validated. */
  timelines(): Promise<PublishedTimelines>;
}

/** Active revisions that cannot form a timeline; published as nothing, never repaired. */
export class InvalidPublishedTimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPublishedTimelineError";
  }
}

/** The requested kinds; null when the parameter is missing, repeated, unknown or duplicated. */
export function parseTimelineKinds(
  raw: unknown,
): PublishedTimelineKind[] | null {
  if (typeof raw !== "string" || raw === "") return null;
  const kinds = raw.split(",");
  const known = new Set<string>(PUBLISHED_TIMELINE_KINDS);
  if (kinds.some((kind) => !known.has(kind))) return null;
  if (new Set(kinds).size !== kinds.length) return null;
  return kinds as PublishedTimelineKind[];
}

/**
 * Why the entries cannot form a monthly timeline; null when they can. Mirrors
 * MonthlyTimeline in @shiftly/domain, which the API cannot import at runtime:
 * a contract test runs the same cases through both, so the API never publishes
 * a timeline the web app would reject.
 */
export function monthlyTimelineProblem(
  entries: readonly {
    readonly validFrom: string;
    readonly validTo: string | null;
  }[],
): string | null {
  const sorted = [...entries].sort((a, b) =>
    a.validFrom.localeCompare(b.validFrom),
  );
  for (const [index, entry] of sorted.entries()) {
    const next = sorted[index + 1];
    const problem = entryProblem(entry, next);
    if (problem !== null) return `entry from ${entry.validFrom}: ${problem}`;
  }
  return null;
}

function entryProblem(
  entry: { readonly validFrom: string; readonly validTo: string | null },
  next: { readonly validFrom: string } | undefined,
): string | null {
  if (!isCalendarDate(entry.validFrom)) return "validFrom is not a date";
  if (!entry.validFrom.endsWith("-01")) {
    return "a monthly value must start on the first day of a month";
  }
  if (entry.validTo !== null) {
    if (!isCalendarDate(entry.validTo)) return "validTo is not a date";
    if (!entry.validTo.endsWith("-01")) {
      return "a monthly value must end on the first day of a month";
    }
    if (entry.validTo <= entry.validFrom) {
      return "validTo is not after validFrom";
    }
  }
  if (next !== undefined) {
    if (entry.validTo === null) {
      return `has no end but ${next.validFrom} starts after it`;
    }
    if (next.validFrom < entry.validTo) {
      return `overlaps the entry from ${next.validFrom}`;
    }
  }
  return null;
}

function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  // Rejects dates that do not exist, such as 2026-02-30.
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(date);
}
