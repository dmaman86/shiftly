import type { Segment } from "@/domain/types/data-shapes";

export class FixedSegmentFactory {
  private readonly fieldShiftPercent: Record<string, number> = {
    hours100: 1,
  };

  constructor() {}

  create(hours: number): Segment {
    return {
      percent: this.fieldShiftPercent.hours100,
      hours: hours,
    };
  }
}
