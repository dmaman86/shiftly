import { BaseRegularCalculator } from "./baseRegular.calculator";
import type { RegularBreakdown } from "../../types/data-shapes";
import type { TimelineInterval } from "../../types/types";

/**
 * Applies base-hours progression to the supplied Regular timeline.
 * Additions and Special intervals are intentionally ignored. The caller owns
 * the aggregation scope: a day classifier passes one date, while a shift
 * classifier can pass a continuous cross-day timeline.
 */
export class BaseHoursClassifier extends BaseRegularCalculator {
  calculate(params: {
    intervals: TimelineInterval[];
    standardHours: number;
  }): RegularBreakdown {
    const regularHours = params.intervals
      .filter((interval) => interval.category === "regular")
      .reduce(
        (total, interval) =>
          total + (interval.point.end - interval.point.start) / 60,
        0,
      );

    const hours100 = Math.min(regularHours, params.standardHours);
    const after100 = regularHours - hours100;
    const hours125 = Math.min(after100, this.config.midTierThreshold);

    return {
      hours100: {
        percent: this.config.percentages.hours100,
        hours: hours100,
      },
      hours125: {
        percent: this.config.percentages.hours125,
        hours: hours125,
      },
      hours150: {
        percent: this.config.percentages.hours150,
        hours: after100 - hours125,
      },
    };
  }
}
