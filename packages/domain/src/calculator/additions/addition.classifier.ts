import { splitTimelineInterval } from "../../timeline/split-timeline-interval.js";
import type { TimelineInterval, TimelineSlice } from "../../types/types.js";

export type AdditionKind = "evening" | "night";

export interface AdditionPolicyRule {
  eveningPercent: number | null;
  nightPercent: number | null;
  eveningQualificationMinutes: number;
}

export type AdditionPolicy = (calendarDate: string) => AdditionPolicyRule;

export interface AdditionInterval {
  point: TimelineSlice["point"];
  calendarDate: string;
  dayOffset: number;
  sourceShiftId?: string;
  kind: AdditionKind;
  percent: number;
}

export const currentAdditionPolicy: AdditionPolicy = () => ({
  eveningPercent: 0.2,
  nightPercent: 0.5,
  eveningQualificationMinutes: 3 * 60,
});

/**
 * Applies date-dependent additions to Regular timeline intervals only.
 * Base classification is deliberately not changed when evening qualification
 * is not met.
 */
export class AdditionClassifier {
  constructor(private readonly policy: AdditionPolicy = currentAdditionPolicy) {}

  calculate(params: { intervals: TimelineInterval[] }): AdditionInterval[] {
    const calendarDates = new Set(
      params.intervals.map((interval) => interval.calendarDate),
    );
    if (calendarDates.size > 1) {
      throw new RangeError(
        "AdditionClassifier expects intervals from one calendar day",
      );
    }

    const calendarDate = [...calendarDates][0];
    if (!calendarDate) return [];

    const policy = this.policy(calendarDate);
    const slices = params.intervals
      .filter((interval) => interval.category === "regular")
      .flatMap((interval) =>
        splitTimelineInterval({
          interval,
          boundaries: [6 * 60, 14 * 60, 22 * 60],
        }),
      );

    const eveningMinutes = slices
      .filter((slice) => this.isEvening(slice))
      .reduce((total, slice) => total + this.durationMinutes(slice), 0);
    const eveningQualifies =
      eveningMinutes >= policy.eveningQualificationMinutes;

    return slices.flatMap((slice) => {
      const kind = this.kindFor(slice);
      if (kind === null) return [];

      const percent =
        kind === "evening"
          ? eveningQualifies
            ? policy.eveningPercent
            : null
          : policy.nightPercent;

      if (percent === null || percent === 0) return [];

      return [{
        point: slice.point,
        calendarDate: slice.calendarDate,
        dayOffset: slice.dayOffset,
        sourceShiftId: slice.sourceShiftId,
        kind,
        percent,
      }];
    });
  }

  private isEvening(slice: TimelineSlice): boolean {
    return slice.localPoint.start >= 14 * 60 && slice.localPoint.end <= 22 * 60;
  }

  private kindFor(slice: TimelineSlice): AdditionKind | null {
    if (slice.localPoint.start >= 22 * 60 || slice.localPoint.end <= 6 * 60) {
      return "night";
    }

    if (slice.localPoint.start >= 14 * 60 && slice.localPoint.end <= 22 * 60) {
      return "evening";
    }

    return null;
  }

  private durationMinutes(slice: TimelineSlice): number {
    return slice.localPoint.end - slice.localPoint.start;
  }
}
