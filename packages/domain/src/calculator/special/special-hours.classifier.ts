import { splitTimelineInterval } from "../../timeline/split-timeline-interval.js";
import type { TimelineInterval, TimelineSlice } from "../../types/types.js";

export type SpecialHoursKind = "special150" | "special200";

export interface SpecialHoursInterval {
  point: TimelineSlice["point"];
  calendarDate: string;
  dayOffset: number;
  sourceShiftId?: string;
  kind: SpecialHoursKind;
  percent: number;
}

/**
 * Applies special-hour rates to Special timeline intervals only.
 */
export class SpecialHoursClassifier {
  calculate(params: { intervals: TimelineInterval[] }): SpecialHoursInterval[] {
    const calendarDates = new Set(
      params.intervals.map((interval) => interval.calendarDate),
    );
    if (calendarDates.size > 1) {
      throw new RangeError(
        "SpecialHoursClassifier expects intervals from one calendar day",
      );
    }

    return params.intervals
      .filter((interval) => interval.category === "special")
      .flatMap((interval) =>
        splitTimelineInterval({
          interval,
          boundaries: [6 * 60, 22 * 60],
        }),
      )
      .map((slice) => {
        const isNight =
          slice.localPoint.start >= 22 * 60 || slice.localPoint.end <= 6 * 60;

        return {
          point: slice.point,
          calendarDate: slice.calendarDate,
          dayOffset: slice.dayOffset,
          sourceShiftId: slice.sourceShiftId,
          kind: isNight ? "special200" : "special150",
          percent: isNight ? 2 : 1.5,
        };
      });
  }
}
