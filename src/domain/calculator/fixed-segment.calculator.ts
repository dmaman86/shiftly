import type { Segment } from "@/domain/types/data-shapes";
import type { Calculator } from "@/domain/types/core-behaviors";

export class FixedSegmentCalculator implements Calculator<number, Segment> {
  private readonly fieldShiftPercent: Record<string, number> = {
    hours100: 1,
  };

  calculate(hours: number): Segment {
    return {
      percent: this.fieldShiftPercent.hours100,
      hours: hours,
    };
  }
}
