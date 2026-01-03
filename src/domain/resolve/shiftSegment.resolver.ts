import { WorkDayType } from "@/constants";
import { LabeledSegmentRange, Point, Resolver, WorkDayMeta } from "@/domain";

export class ShiftSegmentResolver
  implements
    Resolver<
      {
        point: Point;
        meta: WorkDayMeta;
      },
      LabeledSegmentRange[]
    >
{
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

/*export class ShiftSegmentResolver
  implements
    Resolver<
      {
        shift: Shift;
        meta: WorkDayMeta;
        segmentMap: Record<WorkDayType, LabeledSegmentRange[]>;
      },
      LabeledSegmentRange[]
    >
{
  private readonly fieldMinutes: Record<string, number> = {
    fullDay: 1440,
    minutes: 60,
    min06: 6 * 60,
    min14: 14 * 60,
    min17: 17 * 60,
    min18: 18 * 60,
    min22: 22 * 60,
  };
  constructor() {}

  resolve(params: {
    shift: Shift;
    meta: WorkDayMeta;
    segmentMap: Record<WorkDayType, LabeledSegmentRange[]>;
  }): LabeledSegmentRange[] {
    const { shift, meta, segmentMap } = params;
    const start = shift.start.minutes;
    const end = shift.end.minutes;

    if (start >= end) return [];

    const target: Point = { start, end };

    switch (meta.typeDay) {
      case WorkDayType.Regular:
        return this.handleRegular(target, segmentMap.Regular);
      case WorkDayType.SpecialPartialStart:
        return this.handlePartialStart(target, segmentMap);
      case WorkDayType.SpecialFull:
        return this.handleSpecial(
          target,
          meta.crossDayContinuation,
          segmentMap,
        );
      default:
        return [];
    }
  }

  private splitTargetByDay(target: Point): [Point, Point?] {
    const { min06, fullDay } = this.fieldMinutes;
    const dayLimit = min06 + fullDay;
    const targetOne = {
      start: target.start,
      end: Math.min(target.end, dayLimit),
    };
    const targetTwo =
      target.end > dayLimit
        ? { start: min06, end: target.end % fullDay }
        : undefined;
    return [targetOne, targetTwo];
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

  private shiftToNextDay(segs: LabeledSegmentRange[]): LabeledSegmentRange[] {
    return segs.map((s) => ({
      point: {
        start: s.point.start + this.fieldMinutes.fullDay,
        end: s.point.end + this.fieldMinutes.fullDay,
      },
      percent: s.percent,
      key: s.key,
    }));
  }

  private mergeSegments(
    a: LabeledSegmentRange[],
    b: LabeledSegmentRange[],
  ): LabeledSegmentRange[] {
    return [...a, ...b].sort((x, y) => x.point.start - y.point.start);
  }

  private resolveDayRange(
    first: Point,
    src: LabeledSegmentRange[],
    second: Point | undefined,
    nextSrc?: LabeledSegmentRange[],
  ): LabeledSegmentRange[] {
    const part1 = this.findSegments(first, src);
    if (!second) return part1;

    const part2 = this.shiftToNextDay(
      this.findSegments(second, nextSrc ?? src),
    );
    return this.mergeSegments(part1, part2);
  }

  private handleRegular(
    target: Point,
    regular: LabeledSegmentRange[],
  ): LabeledSegmentRange[] {
    const [targetOne, targetTwo] = this.splitTargetByDay(target);
    return this.resolveDayRange(targetOne, regular, targetTwo);
  }

  private handlePartialStart(
    target: Point,
    map: Record<WorkDayType, LabeledSegmentRange[]>,
  ): LabeledSegmentRange[] {
    const [t1, t2] = this.splitTargetByDay(target);

    return this.resolveDayRange(
      t1,
      map.SpecialPartialStart,
      t2,
      map.SpecialFull,
    );
  }

  private handleSpecial(
    target: Point,
    cross: boolean,
    map: Record<WorkDayType, LabeledSegmentRange[]>,
  ): LabeledSegmentRange[] {
    const [t1, t2] = this.splitTargetByDay(target);
    const nextSrc = cross ? map.SpecialFull : map.Regular;
    return this.resolveDayRange(t1, map.SpecialFull, t2, nextSrc);
  }
}*/
