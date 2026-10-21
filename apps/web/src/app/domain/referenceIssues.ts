import type {
  ReferenceKey,
  ReferenceResolver,
  TimelineUnavailableReason,
} from "@shiftly/domain";

/**
 * A rate the calculation needs that the chosen timelines cannot resolve for a
 * month. The month is not calculated: a missing rate is never a zero.
 */
export interface ReferenceIssue {
  key: ReferenceKey;
  /** The first day of the month, YYYY-MM-DD. */
  on: string;
  reason: TimelineUnavailableReason;
}

/** Every reference a month's pay reads. */
const MONTH_REFERENCES: readonly ReferenceKey[] = [
  "perDiemPointRate",
  "mealAllowanceRates",
];

/** Monthly references change on the first day, so that day decides the month. */
export const monthReferenceIssues = (
  resolver: ReferenceResolver,
  year: number,
  month: number,
): ReferenceIssue[] => {
  const on = `${year}-${String(month).padStart(2, "0")}-01`;
  return MONTH_REFERENCES.flatMap((key) => {
    const resolution = resolver.resolve(key, on);
    return resolution.status === "unavailable"
      ? [{ key, on, reason: resolution.reason }]
      : [];
  });
};
