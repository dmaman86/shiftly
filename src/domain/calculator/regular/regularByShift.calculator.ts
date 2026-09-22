import { WorkDayType } from "@/domain/constants";
import { BaseRegularCalculator } from "./baseRegular.calculator";
import type { Calculator } from "../../types/core-behaviors";
import type { RegularBreakdown, RegularInput } from "../../types/data-shapes";
import type { LabeledSegmentRange, WorkDayMeta } from "../../types/types";

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

  calculateFromSegments(params: {
    segments: LabeledSegmentRange[];
    standardHours: number;
    meta: WorkDayMeta;
  }): RegularBreakdown {
    const result = this.createEmpty();
    let elapsedHours = 0;

    const segments = [...params.segments].sort(
      (a, b) => a.point.start - b.point.start,
    );

    for (const segment of segments) {
      const durationHours = (segment.point.end - segment.point.start) / 60;
      if (durationHours <= 0) continue;

      if (segment.key === "shabbat150" || segment.key === "shabbat200") {
        // Special-rate hours replace the base progression. Once a shift has
        // crossed a special segment, subsequent regular hours continue at
        // 150% instead of restarting at 100% or entering the 125% tier.
        elapsedHours = Math.max(
          elapsedHours + durationHours,
          params.standardHours + this.config.midTierThreshold,
        );
        continue;
      }

      const availableAt100 = Math.max(params.standardHours - elapsedHours, 0);
      const hours100 = Math.min(durationHours, availableAt100);
      result.hours100.hours += hours100;
      elapsedHours += hours100;

      const remainingAfter100 = durationHours - hours100;
      const availableAt125 = Math.max(
        this.config.midTierThreshold - Math.max(elapsedHours - params.standardHours, 0),
        0,
      );
      const hours125 = Math.min(remainingAfter100, availableAt125);
      result.hours125.hours += hours125;
      elapsedHours += hours125;

      const hours150 = remainingAfter100 - hours125;
      result.hours150.hours += hours150;
      elapsedHours += hours150;
    }

    return result;
  }
}
