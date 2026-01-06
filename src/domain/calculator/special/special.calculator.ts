import type { SpecialBreakdown } from "@/domain/types/data-shapes";
import type { LabeledSegmentRange } from "@/domain/types/types";
import type { Calculator, Reducer } from "@/domain/types/core-behaviors";

export class SpecialCalculator
  implements
    Calculator<LabeledSegmentRange[], SpecialBreakdown>,
    Reducer<SpecialBreakdown>
{
  private readonly fieldShiftPercent: Record<string, number> = {
    hours150: 1.5,
    hours200: 2,
  };

  constructor() {}

  createEmpty(): SpecialBreakdown {
    return {
      shabbat150: { percent: this.fieldShiftPercent.hours150, hours: 0 },
      shabbat200: { percent: this.fieldShiftPercent.hours200, hours: 0 },
    };
  }

  calculate(labeledSegments: LabeledSegmentRange[]): SpecialBreakdown {
    const sum = (key: string) =>
      labeledSegments
        .filter((s) => s.key === key)
        .reduce((acc, seg) => acc + (seg.point.end - seg.point.start) / 60, 0);

    return {
      shabbat150: {
        percent: this.fieldShiftPercent.hours150,
        hours: sum("shabbat150"),
      },
      shabbat200: {
        percent: this.fieldShiftPercent.hours200,
        hours: sum("shabbat200"),
      },
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

  subtract(base: SpecialBreakdown, sub: SpecialBreakdown): SpecialBreakdown {
    return {
      shabbat150: {
        percent: base.shabbat150.percent,
        hours: Math.max(base.shabbat150.hours - sub.shabbat150.hours, 0),
      },
      shabbat200: {
        percent: base.shabbat200.percent,
        hours: Math.max(base.shabbat200.hours - sub.shabbat200.hours, 0),
      },
    };
  }
}
