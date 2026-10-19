import type { TimelineInterval, WorkDayMeta } from "../types/types.js";

/** Additional 100% pay for regular work inside an election date's 07:00–22:00 window. */
export const calculateElectionHours = (
  intervals: readonly TimelineInterval[],
  meta?: WorkDayMeta,
): number => {
  if (!meta) return 0;
  let minutes = 0;
  for (const interval of intervals) {
    const isElection =
      meta.calendarKnessetNumbers?.[interval.calendarDate] !== undefined ||
      (interval.calendarDate === meta.date && meta.knessetNumber !== undefined);
    if (!isElection || interval.category !== "regular") continue;
    const dayStart = interval.dayOffset * 1440;
    minutes += Math.max(
      0,
      Math.min(interval.point.end, dayStart + 22 * 60) -
        Math.max(interval.point.start, dayStart + 7 * 60),
    );
  }
  return minutes / 60;
};
