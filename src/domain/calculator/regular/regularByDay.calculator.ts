import { WorkDayType } from "@/constants";
import {
  BaseRegularCalculator,
  Calculator,
  RegularBreakdown,
  RegularInput,
} from "@/domain";

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
}
