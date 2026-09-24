import { WorkDayType } from "@/domain/constants";
import { BaseRegularCalculator } from "./baseRegular.calculator";
import type { Calculator } from "../../types/core-behaviors";
import type { RegularBreakdown, RegularInput } from "../../types/data-shapes";
import type { ClassifiedInterval, WorkDayMeta } from "../../types/types";
import { selectRegularIntervals } from "../../classification";


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

  calculateClassified(params: {
    intervals: ClassifiedInterval[];
    standardHours: number;
    meta: WorkDayMeta;
  }): RegularBreakdown {
    const regularHours = selectRegularIntervals(params.intervals).reduce(
      (total, interval) =>
        total + (interval.point.end - interval.point.start) / 60,
      0,
    );

    return this.calculate({
      totalHours: regularHours,
      standardHours: params.standardHours,
      meta: params.meta,
    });
  }
}
