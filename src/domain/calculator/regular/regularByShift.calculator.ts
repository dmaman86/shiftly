import { WorkDayType } from "@/domain/constants";
import { BaseRegularCalculator } from "./baseRegular.calculator";
import type { Calculator } from "../../types/core-behaviors";
import type { RegularBreakdown, RegularInput } from "../../types/data-shapes";
import type {
  ClassifiedInterval,
  WorkDayMeta,
} from "../../types/types";
import { selectRegularIntervals } from "../../classification";

export class RegularByShiftCalculator
  extends BaseRegularCalculator
  implements Calculator<RegularInput, RegularBreakdown>
{
  calculate(params: RegularInput): RegularBreakdown {
    const { totalHours, standardHours, meta } = params;
    if (meta.typeDay === WorkDayType.SpecialFull && !meta.crossDayContinuation)
      return this.handleSpecial(totalHours);

    let remaining = totalHours;

    const overflow150 = Math.max(
      remaining - (standardHours + this.config.midTierThreshold),
      0,
    );
    remaining -= overflow150;

    const overflow125 = Math.max(remaining - standardHours, 0);
    remaining -= overflow125;

    const overflow100 = Math.max(remaining, 0);

    return {
      hours100: {
        percent: this.config.percentages.hours100,
        hours: overflow100,
      },
      hours125: {
        percent: this.config.percentages.hours125,
        hours: overflow125,
      },
      hours150: {
        percent: this.config.percentages.hours150,
        hours: overflow150,
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
