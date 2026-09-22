import { WorkDayType } from "@/domain/constants";
import type {
  LabeledSegmentRange,
  Point,
  WorkDayMeta,
} from "../types/types";
import type { Calculator } from "../types/core-behaviors";
import type { DateService } from "../services/date.service";

type SegmentDefinition = {
  point: Point;
  percent: number;
  key: LabeledSegmentRange["key"];
};

export class ShiftSegmentCalculator implements Calculator<
  {
    point: Point;
    meta: WorkDayMeta;
  },
  LabeledSegmentRange[]
> {
  private readonly fieldMinutes = {
    min06: 6 * 60,
    min14: 14 * 60,
    min22: 22 * 60,
    fullDay: 1440,
    eveningQualification: 3 * 60,
  };

  private readonly fieldShiftPercent = {
    hours50: 0.5,
    hours20: 0.2,
    hours100: 1.0,
    hours150: 1.5,
    hours200: 2.0,
  };

  constructor(private readonly dateService: DateService) {}

  calculate(params: {
    point: Point;
    meta: WorkDayMeta;
  }): LabeledSegmentRange[] {
    const { point, meta } = params;
    if (point.start >= point.end) return [];

    const definitions = this.getDefinitions(meta);
    const qualifiesForHours20 = this.qualifiesForHours20(point, meta);

    return definitions.flatMap((definition) => {
      const start = Math.max(definition.point.start, point.start);
      const end = Math.min(definition.point.end, point.end);
      if (start >= end) return [];

      if (definition.key !== "hours20" || qualifiesForHours20) {
        return [{
          point: { start, end },
          percent: definition.percent,
          key: definition.key,
        }];
      }

      return [{
        point: { start, end },
        percent: this.fieldShiftPercent.hours100,
        key: "hours100" as const,
      }];
    });
  }

  private qualifiesForHours20(point: Point, meta: WorkDayMeta): boolean {
    const eveningStart = this.fieldMinutes.min14;
    const eveningEnd =
      meta.typeDay === WorkDayType.SpecialPartialStart
        ? this.dateService.getSpecialStartMinutes(meta.date)
        : this.fieldMinutes.min22;

    const qualifyingStart = Math.max(point.start, eveningStart);
    const qualifyingEnd = Math.min(point.end, eveningEnd);

    return (
      qualifyingEnd - qualifyingStart >= this.fieldMinutes.eveningQualification
    );
  }

  private getDefinitions(meta: WorkDayMeta): SegmentDefinition[] {
    switch (meta.typeDay) {
      case WorkDayType.Regular:
        return this.getRegularDefinitions();
      case WorkDayType.SpecialPartialStart:
        return this.getSpecialPartialDefinitions(meta.date);
      case WorkDayType.SpecialFull:
        return this.getSpecialFullDefinitions();
    }
  }

  private getRegularDefinitions(): SegmentDefinition[] {
    return [
      {
        point: { start: 0, end: this.fieldMinutes.min06 },
        percent: this.fieldShiftPercent.hours50,
        key: "hours50",
      },
      {
        point: { start: this.fieldMinutes.min06, end: this.fieldMinutes.min14 },
        percent: this.fieldShiftPercent.hours100,
        key: "hours100",
      },
      {
        point: { start: this.fieldMinutes.min14, end: this.fieldMinutes.min22 },
        percent: this.fieldShiftPercent.hours20,
        key: "hours20",
      },
      {
        point: {
          start: this.fieldMinutes.min22,
          end: this.fieldMinutes.min06 + this.fieldMinutes.fullDay,
        },
        percent: this.fieldShiftPercent.hours50,
        key: "hours50",
      },
    ];
  }

  private getSpecialPartialDefinitions(date: string): SegmentDefinition[] {
    const specialStart = this.dateService.getSpecialStartMinutes(date);

    return [
      {
        point: { start: 0, end: this.fieldMinutes.min06 },
        percent: this.fieldShiftPercent.hours50,
        key: "hours50",
      },
      {
        point: { start: this.fieldMinutes.min06, end: this.fieldMinutes.min14 },
        percent: this.fieldShiftPercent.hours100,
        key: "hours100",
      },
      {
        point: { start: this.fieldMinutes.min14, end: specialStart },
        percent: this.fieldShiftPercent.hours20,
        key: "hours20",
      },
      {
        point: { start: specialStart, end: this.fieldMinutes.min22 },
        percent: this.fieldShiftPercent.hours150,
        key: "shabbat150",
      },
      {
        point: {
          start: this.fieldMinutes.min22,
          end: this.fieldMinutes.min06 + this.fieldMinutes.fullDay,
        },
        percent: this.fieldShiftPercent.hours200,
        key: "shabbat200",
      },
    ];
  }

  private getSpecialFullDefinitions(): SegmentDefinition[] {
    return [
      {
        point: { start: 0, end: this.fieldMinutes.min06 },
        percent: this.fieldShiftPercent.hours200,
        key: "shabbat200",
      },
      {
        point: { start: this.fieldMinutes.min06, end: this.fieldMinutes.min22 },
        percent: this.fieldShiftPercent.hours150,
        key: "shabbat150",
      },
      {
        point: {
          start: this.fieldMinutes.min22,
          end: this.fieldMinutes.min06 + this.fieldMinutes.fullDay,
        },
        percent: this.fieldShiftPercent.hours200,
        key: "shabbat200",
      },
    ];
  }
}
