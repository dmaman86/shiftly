import { WorkDayType } from "../../constants/index.js";
import { BaseRegularCalculator } from "./baseRegular.calculator.js";
import { BaseHoursClassifier } from "./base-hours.classifier.js";
import type { Calculator } from "../../types/core-behaviors.js";
import type {
  RegularBreakdown,
  RegularInput,
} from "../../types/data-shapes.js";
import type { TimelineInterval, WorkDayMeta } from "../../types/types.js";

export class RegularByDayCalculator
  extends BaseRegularCalculator
  implements Calculator<RegularInput, RegularBreakdown>
{
  calculate(params: RegularInput): RegularBreakdown {
    const { totalHours, standardHours, meta } = params;

    if (meta.typeDay === WorkDayType.SpecialFull && !meta.crossDayContinuation)
      return this.handleSpecial(totalHours);
    const adj100 = Math.min(totalHours, standardHours);
    const overflow100 = totalHours - adj100;

    const adj125 = Math.min(overflow100, this.config.midTierThreshold);
    const overflow125 = overflow100 - adj125;

    return {
      hours100: { percent: this.config.percentages.hours100, hours: adj100 },
      hours125: { percent: this.config.percentages.hours125, hours: adj125 },
      hours150: {
        percent: this.config.percentages.hours150,
        hours: overflow125,
      },
    };
  }

  calculateFromTimeline(params: {
    intervals: TimelineInterval[];
    standardHours: number;
    meta: WorkDayMeta;
  }): RegularBreakdown {
    return new BaseHoursClassifier(this.config).calculate({
      intervals: params.intervals,
      standardHours: params.standardHours,
      meta: params.meta,
    });
  }
}
