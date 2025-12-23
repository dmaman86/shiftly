import { WorkDayType } from "@/constants";
import { LabeledSegmentRange } from "@/domain/types/types";

export class ShiftSegmentMapBuilder {
  private readonly fieldMinutes: Record<string, number> = {
    fullDay: 1440,
    min06: 6 * 60,
    min14: 14 * 60,
    min17: 17 * 60,
    min22: 22 * 60,
  };

  private readonly fieldShiftPercent: Record<string, number> = {
    hours50: 0.5,
    hours20: 0.2,
    hours100: 1.0,
    hours150: 1.5,
    hours200: 2.0,
  };

  constructor() {}

  build(specialStart: number): Record<WorkDayType, LabeledSegmentRange[]> {
    const { min06, min14, min17, min22, fullDay } = this.fieldMinutes;
    const { hours50, hours20, hours100, hours150, hours200 } =
      this.fieldShiftPercent;

    return {
      [WorkDayType.Regular]: [
        { point: { start: 0, end: min06 }, percent: hours50, key: "hours50" },
        {
          point: { start: min06, end: min17 - 1 },
          percent: hours100,
          key: "hours100",
        },
        {
          point: { start: min14, end: min22 },
          percent: hours20,
          key: "hours20",
        },
        {
          point: { start: min22, end: min06 + fullDay },
          percent: hours50,
          key: "hours50",
        },
      ],

      [WorkDayType.SpecialPartialStart]: [
        { point: { start: 0, end: min06 }, percent: hours50, key: "hours50" },
        {
          point: { start: min06, end: min17 - 1 },
          percent: hours100,
          key: "hours100",
        },
        {
          point: { start: min14, end: specialStart - 1 },
          percent: hours20,
          key: "hours20",
        },
        {
          point: { start: specialStart, end: min22 },
          percent: hours150,
          key: "shabbat150",
        },
        {
          point: { start: min22, end: min06 + fullDay },
          percent: hours200,
          key: "shabbat200",
        },
      ],

      [WorkDayType.SpecialFull]: [
        {
          point: { start: 0, end: min06 },
          percent: hours200,
          key: "shabbat200",
        },
        {
          point: { start: min06, end: min22 },
          percent: hours150,
          key: "shabbat150",
        },
        {
          point: { start: min22, end: min06 + fullDay },
          percent: hours200,
          key: "shabbat200",
        },
      ],
    };
  }
}
