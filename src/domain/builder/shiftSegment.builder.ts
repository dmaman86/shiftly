import { WorkDayType } from "@/constants";
import { LabeledSegmentRange, Point, WorkDayMeta } from "@/domain/types/types";
import { Builder } from "../types/core-behaviors";
import { ShiftSegmentResolver } from "../resolve";
import { Shift } from "../types/data-shapes";

export class ShiftSegmentBuilder
  implements Builder<{ shift: Shift; meta: WorkDayMeta }, LabeledSegmentRange[]>
{
  private readonly fieldMinutes = {
    fullDay: 1440,
    min06: 6 * 60,
  };

  constructor(private readonly segmentResolver: ShiftSegmentResolver) {}

  build(params: { shift: Shift; meta: WorkDayMeta }): LabeledSegmentRange[] {
    const { shift, meta } = params;

    const point: Point = {
      start: shift.start.minutes,
      end: shift.end.minutes,
    };

    if (point.start >= point.end) return [];

    const [firstPart, secondPart] = this.splitTarget(point);

    const part1 = this.segmentResolver.resolve({
      point: firstPart,
      meta,
    });

    if (!secondPart) return part1;

    const metaNextDay: WorkDayMeta = {
      ...meta,
      date: this.nextDate(meta.date),
      typeDay: meta.crossDayContinuation
        ? WorkDayType.SpecialFull
        : WorkDayType.Regular,
      crossDayContinuation: false,
    };

    const part2 = this.shiftToNextDay(
      this.segmentResolver.resolve({
        point: secondPart,
        meta: metaNextDay,
      }),
    );
    return this.mergeSegments(part1, part2);
  }

  private splitTarget(target: Point): [Point, Point?] {
    const dayLimit = this.fieldMinutes.min06 + this.fieldMinutes.fullDay;

    const first: Point = {
      start: target.start,
      end: Math.min(target.end, dayLimit),
    };

    const second: Point | undefined =
      target.end > dayLimit
        ? {
            start: this.fieldMinutes.min06,
            end: target.end % this.fieldMinutes.fullDay,
          }
        : undefined;

    return [first, second];
  }

  private shiftToNextDay(
    segments: LabeledSegmentRange[],
  ): LabeledSegmentRange[] {
    return segments.map((s) => ({
      ...s,
      point: {
        start: s.point.start + this.fieldMinutes.fullDay,
        end: s.point.end + this.fieldMinutes.fullDay,
      },
    }));
  }

  private mergeSegments(
    a: LabeledSegmentRange[],
    b: LabeledSegmentRange[],
  ): LabeledSegmentRange[] {
    return [...a, ...b].sort((x, y) => x.point.start - y.point.start);
  }

  private nextDate(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
}
