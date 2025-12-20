import { WorkDayType } from "@/constants";
import {
  RegularBreakdown,
  WorkDayMeta,
  BaseRegularCalculator,
  RegularCalculator,
} from "@/domain";

export class RegularByShiftCalculator
  extends BaseRegularCalculator
  implements RegularCalculator
{
  calculate(
    totalHours: number,
    standardHours: number,
    meta: WorkDayMeta,
  ): RegularBreakdown {
    if (meta.typeDay === WorkDayType.SpecialFull && !meta.crossDayContinuation)
      return this.handleSpecial(totalHours);

    let remaining = totalHours;

    const overflow150 = Math.max(
      remaining - (standardHours + this.MID_TIER),
      0,
    );
    remaining -= overflow150;

    const overflow125 = Math.max(remaining - standardHours, 0);
    remaining -= overflow125;

    const overflow100 = Math.max(remaining, 0);

    return {
      hours100: {
        percent: this.fieldShiftPercent.hours100,
        hours: overflow100,
      },
      hours125: {
        percent: this.fieldShiftPercent.hours125,
        hours: overflow125,
      },
      hours150: {
        percent: this.fieldShiftPercent.hours150,
        hours: overflow150,
      },
    };
  }
}
