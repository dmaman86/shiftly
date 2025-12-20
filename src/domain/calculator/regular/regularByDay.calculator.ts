import { WorkDayType } from "@/constants";
import {
  BaseRegularCalculator,
  RegularBreakdown,
  RegularCalculator,
  WorkDayMeta,
} from "@/domain";

export class RegularByDayCalculator
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
    const adj100 = Math.min(totalHours, standardHours);
    const overflow100 = totalHours - adj100;

    const adj125 = Math.min(overflow100, this.MID_TIER);
    const overflow125 = overflow100 - adj125;

    return {
      hours100: { percent: this.fieldShiftPercent.hours100, hours: adj100 },
      hours125: { percent: this.fieldShiftPercent.hours125, hours: adj125 },
      hours150: {
        percent: this.fieldShiftPercent.hours150,
        hours: overflow125,
      },
    };
  }
}
