import { AdditionClassifier } from "./additions/addition.classifier.js";
import { additionGroupKey } from "./additions/addition-groups.js";
import { BaseHoursClassifier } from "./regular/base-hours.classifier.js";
import { SpecialHoursClassifier } from "./special/special-hours.classifier.js";
import type {
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
} from "../types/data-shapes.js";
import type { TimelineInterval } from "../types/types.js";

export interface TimelineShiftPay {
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
}

/**
 * Composes the new salary pipelines over a classified timeline. Intervals
 * Base-hour progression is applied once over the complete Regular timeline.
 * Additions and Special rates remain calendar-day policies.
 */
export class TimelineShiftPayCalculator {
  constructor(
    private readonly baseHours = new BaseHoursClassifier(),
    private readonly additions = new AdditionClassifier(),
    private readonly specialHours = new SpecialHoursClassifier(),
  ) {}

  calculate(params: {
    intervals: TimelineInterval[];
    standardHours: number;
  }): TimelineShiftPay {
    const result = this.createEmpty();
    const intervalsByDate = new Map<string, TimelineInterval[]>();

    for (const interval of params.intervals) {
      const dayIntervals = intervalsByDate.get(interval.calendarDate) ?? [];
      dayIntervals.push(interval);
      intervalsByDate.set(interval.calendarDate, dayIntervals);
    }

    result.regular = this.baseHours.calculate({
      intervals: params.intervals,
      standardHours: params.standardHours,
    });

    for (const dayIntervals of intervalsByDate.values()) {

      for (const addition of this.additions.calculate({
        intervals: dayIntervals,
      })) {
        const key = additionGroupKey(addition.kind, addition.percent);
        const segment = result.extra[key] ?? { percent: addition.percent, hours: 0 };
        result.extra[key] = {
          percent: addition.percent,
          hours: segment.hours + (addition.point.end - addition.point.start) / 60,
        };
      }

      for (const special of this.specialHours.calculate({
        intervals: dayIntervals,
      })) {
        const key = special.kind === "special150" ? "shabbat150" : "shabbat200";
        result.special[key].hours +=
          (special.point.end - special.point.start) / 60;
      }
    }

    return result;
  }

  private createEmpty(): TimelineShiftPay {
    return {
      regular: this.baseHours.createEmpty(),
      extra: {
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 0 },
      },
      special: {
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 0 },
      },
    };
  }

}
