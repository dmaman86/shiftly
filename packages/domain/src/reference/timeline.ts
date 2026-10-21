/**
 * A value that changes over time, such as a rate. Each entry applies on
 * [validFrom, validTo); validTo null means until further notice. Provenance
 * (revisions, trust, sources) stays in the application layer: the domain only
 * needs to know which value applies on a date.
 */
export type TimelineEntry<T> = {
  /** YYYY-MM-DD, inclusive. */
  readonly validFrom: string;
  /** YYYY-MM-DD, exclusive; null when the value has no end yet. */
  readonly validTo: string | null;
  readonly value: T;
};

export type TimelineUnavailableReason =
  /** Before SYSTEM_START_DATE: Shiftly does not calculate that period. */
  | "out_of_range"
  /** Inside the supported period, but no entry covers the date. */
  | "not_covered";

export type TimelineResolution<T> =
  | {
      readonly status: "resolved";
      readonly value: T;
      readonly validFrom: string;
      readonly validTo: string | null;
    }
  | {
      readonly status: "unavailable";
      readonly reason: TimelineUnavailableReason;
    };

/** The entries cannot form a timeline; raised when it is built, never while calculating. */
export class InvalidTimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTimelineError";
  }
}

/** Values that change on the first day of a month, as the pay rules apply them. */
export class MonthlyTimeline<T> {
  private readonly entries: readonly TimelineEntry<T>[];

  constructor(name: string, entries: readonly TimelineEntry<T>[]) {
    const sorted = [...entries].sort((a, b) =>
      a.validFrom.localeCompare(b.validFrom),
    );
    sorted.forEach((entry, index) => {
      const problem = entryProblem(entry, sorted[index + 1]);
      if (problem !== null) {
        throw new InvalidTimelineError(
          `${name} entry from ${entry.validFrom}: ${problem}`,
        );
      }
    });
    this.entries = sorted;
  }

  /**
   * The value that applies on a date. A date no entry covers (before the
   * first entry, in a gap, or after a closed last entry) is not_covered:
   * never the nearest value, never zero.
   */
  resolve(on: string): TimelineResolution<T> {
    assertCalendarDate(on);
    const entry = this.entries.find(
      (candidate) =>
        candidate.validFrom <= on &&
        (candidate.validTo === null || on < candidate.validTo),
    );
    return entry
      ? {
          status: "resolved",
          value: entry.value,
          validFrom: entry.validFrom,
          validTo: entry.validTo,
        }
      : { status: "unavailable", reason: "not_covered" };
  }
}

function entryProblem<T>(
  entry: TimelineEntry<T>,
  next: TimelineEntry<T> | undefined,
): string | null {
  if (!isCalendarDate(entry.validFrom)) return "validFrom is not a date";
  if (!isMonthStart(entry.validFrom)) {
    return "a monthly value must start on the first day of a month";
  }
  if (entry.validTo !== null) {
    if (!isCalendarDate(entry.validTo)) return "validTo is not a date";
    if (!isMonthStart(entry.validTo)) {
      return "a monthly value must end on the first day of a month";
    }
    if (entry.validTo <= entry.validFrom)
      return "validTo is not after validFrom";
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

const isMonthStart = (date: string) => date.endsWith("-01");

export function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  // Rejects dates that do not exist, such as 2026-02-30.
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(date);
}

export function assertCalendarDate(date: string): void {
  if (!isCalendarDate(date)) {
    throw new RangeError(`${date} is not a YYYY-MM-DD date`);
  }
}

/** The first day of a month (1-based), YYYY-MM-DD. */
export const monthStart = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}-01`;
