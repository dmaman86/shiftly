import { WorkDayType } from "@/constants";
import { LabeledSegmentRange, Point, Resolver, WorkDayMeta } from "@/domain";

export class ShiftSegmentResolver implements Resolver<
  {
    point: Point;
    meta: WorkDayMeta;
  },
  LabeledSegmentRange[]
> {
  private readonly fieldMinutes = {
    fullDay: 1440,
    min06: 6 * 60,
    min14: 14 * 60,
    min17: 17 * 60,
    min18: 18 * 60,
    min22: 22 * 60,
  };

  private readonly fieldShiftPercent = {
    hours50: 0.5,
    hours20: 0.2,
    hours100: 1.0,
    hours125: 1.25,
    hours150: 1.5,
    hours200: 2.0,
  };

  constructor() {}

  resolve(params: { point: Point; meta: WorkDayMeta }): LabeledSegmentRange[] {
    const { point, meta } = params;

    const source = (() => {
      switch (meta.typeDay) {
        case WorkDayType.Regular:
          return this.getRegularMap();
        case WorkDayType.SpecialPartialStart:
          return this.getSpecialPartialMap(meta.date);
        case WorkDayType.SpecialFull:
          return this.getSpecialFullMap();
      }
    })();

    return this.findSegments(point, source);
  }

  private getSpecialStartMinutes(date: string): number {
    const offsetMinutes = new Date(date).getTimezoneOffset();
    const specialStart = -offsetMinutes / 60 === 3 ? 18 : 17;
    return specialStart * 60;
  }

  private getRegularMap(): LabeledSegmentRange[] {
    return [
      {
        point: { start: 0, end: this.fieldMinutes.min06 },
        percent: this.fieldShiftPercent.hours50,
        key: "hours50",
      },
      {
        point: {
          start: this.fieldMinutes.min06,
          end: this.fieldMinutes.min17 - 1,
        },
        percent: this.fieldShiftPercent.hours100,
        key: "hours100",
      },
      {
        point: {
          start: this.fieldMinutes.min14,
          end: this.fieldMinutes.min22,
        },
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

  private getSpecialPartialMap(date: string): LabeledSegmentRange[] {
    const specialStart = this.getSpecialStartMinutes(date);

    return [
      {
        point: { start: 0, end: this.fieldMinutes.min06 },
        percent: this.fieldShiftPercent.hours50,
        key: "hours50",
      },
      {
        point: {
          start: this.fieldMinutes.min06,
          end: this.fieldMinutes.min17 - 1,
        },
        percent: this.fieldShiftPercent.hours100,
        key: "hours100",
      },
      {
        point: { start: this.fieldMinutes.min14, end: specialStart - 1 },
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

  private getSpecialFullMap(): LabeledSegmentRange[] {
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

  private findSegments(
    target: Point,
    src: LabeledSegmentRange[],
  ): LabeledSegmentRange[] {
    const starts = src.map((s) => s.point.start);
    const ends = src.map((s) => s.point.end);

    const i = starts.filter((s) => s <= target.start).length - 1;
    const j = ends.findIndex((e) => e >= target.end);

    if (i === -1 || j === -1 || i > j) return [];

    const result: LabeledSegmentRange[] = [];
    for (let k = i; k <= j; k++) {
      const { point, percent, key } = src[k];
      const segStart = Math.max(point.start, target.start);
      const segEnd = Math.min(point.end, target.end);
      if (segStart < segEnd) {
        result.push({ point: { start: segStart, end: segEnd }, percent, key });
      }
    }
    return result;
  }
}
