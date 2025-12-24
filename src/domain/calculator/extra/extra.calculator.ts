import {
  ExtraBreakdown,
  LabeledSegmentRange,
  Calculator,
  Reducer,
} from "@/domain";

export class ExtraCalculator
  implements
    Calculator<LabeledSegmentRange[], ExtraBreakdown>,
    Reducer<ExtraBreakdown>
{
  private readonly fieldShiftPercent: Record<string, number> = {
    hours20: 0.2,
    hours50: 0.5,
  };
  constructor() {}

  createEmpty(): ExtraBreakdown {
    return {
      hours20: { percent: this.fieldShiftPercent.hours20, hours: 0 },
      hours50: { percent: this.fieldShiftPercent.hours50, hours: 0 },
    };
  }

  calculate(labeledSegments: LabeledSegmentRange[]): ExtraBreakdown {
    const sum = (key: string) =>
      labeledSegments
        .filter((s) => s.key === key)
        .reduce((acc, seg) => acc + (seg.point.end - seg.point.start) / 60, 0);

    return {
      hours20: {
        percent: this.fieldShiftPercent.hours20,
        hours: sum("hours20"),
      },
      hours50: {
        percent: this.fieldShiftPercent.hours50,
        hours: sum("hours50"),
      },
    };
  }

  accumulate(base: ExtraBreakdown, add: ExtraBreakdown): ExtraBreakdown {
    return {
      hours20: {
        percent: base.hours20.percent,
        hours: base.hours20.hours + add.hours20.hours,
      },
      hours50: {
        percent: base.hours50.percent,
        hours: base.hours50.hours + add.hours50.hours,
      },
    };
  }

  subtract(base: ExtraBreakdown, sub: ExtraBreakdown): ExtraBreakdown {
    return {
      hours20: {
        percent: base.hours20.percent,
        hours: Math.max(base.hours20.hours - sub.hours20.hours, 0),
      },
      hours50: {
        percent: base.hours50.percent,
        hours: Math.max(base.hours50.hours - sub.hours50.hours, 0),
      },
    };
  }
}
