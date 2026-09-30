import type { SpecialBreakdown } from "../../types/data-shapes.js";
import type { Reducer } from "../../types/core-behaviors.js";

export class SpecialCalculator implements Reducer<SpecialBreakdown> {
  private readonly fieldShiftPercent: Record<string, number> = {
    hours150: 1.5,
    hours200: 2,
  };

  createEmpty(): SpecialBreakdown {
    return {
      shabbat150: { percent: this.fieldShiftPercent.hours150, hours: 0 },
      shabbat200: { percent: this.fieldShiftPercent.hours200, hours: 0 },
    };
  }

  accumulate(base: SpecialBreakdown, add: SpecialBreakdown): SpecialBreakdown {
    return {
      shabbat150: {
        percent: base.shabbat150.percent,
        hours: base.shabbat150.hours + add.shabbat150.hours,
      },
      shabbat200: {
        percent: base.shabbat200.percent,
        hours: base.shabbat200.hours + add.shabbat200.hours,
      },
    };
  }
}
