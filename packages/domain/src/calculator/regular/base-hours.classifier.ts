import { BaseRegularCalculator } from "./baseRegular.calculator.js";
import type { RegularBreakdown } from "../../types/data-shapes.js";
import type { TimelineInterval, WorkDayMeta } from "../../types/types.js";
import { Weekend, WorkDayType } from "../../constants/index.js";
import { calculateElectionHours } from "../election-hours.calculator.js";

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
    meta?: WorkDayMeta;
  }): RegularBreakdown {
    const regularHours = params.intervals
      .filter((interval) => interval.category === "regular")
      .reduce(
        (total, interval) =>
          total + (interval.point.end - interval.point.start) / 60,
        0,
      );

    // A Saturday-start shift keeps its regular remainder at 150%, regardless
    // of duration or whether the immediately following date is also special.
    const startsOnSaturday =
      params.meta &&
      new Date(params.meta.date).getUTCDay() === Weekend.SATURDAY;
    if (
      params.meta?.typeDay === WorkDayType.SpecialFull &&
      (startsOnSaturday || !params.meta.crossDayContinuation)
    ) {
      const result = this.handleSpecial(regularHours);
      result.hours100.hours += calculateElectionHours(
        params.intervals,
        params.meta,
      );
      return result;
    }

    const hours100 = Math.min(regularHours, params.standardHours);
    const after100 = regularHours - hours100;
    const hours125 = Math.min(after100, this.config.midTierThreshold);

    return {
      hours100: {
        percent: this.config.percentages.hours100,
        // Pay-equivalent hours only: the timeline and actual duration stay unchanged.
        hours: hours100 + calculateElectionHours(params.intervals, params.meta),
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
