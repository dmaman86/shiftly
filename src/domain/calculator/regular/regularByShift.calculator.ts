import { WorkDayType } from "@/constants";
import {
  RegularBreakdown,
  BaseRegularCalculator,
  Calculator,
  RegularInput,
} from "@/domain";

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
}
