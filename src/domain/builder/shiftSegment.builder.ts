import { WorkDayType } from "@/constants";
import { LabeledSegmentRange, Point, WorkDayMeta } from "@/domain/types/types";
import { Builder } from "../types/core-behaviors";
import { ShiftSegmentResolver } from "../resolve";
import { Shift } from "../types/data-shapes";
import { ShiftService } from "../services";

export class ShiftSegmentBuilder implements Builder<
  { shift: Shift; meta: WorkDayMeta },
  LabeledSegmentRange[]
> {
  private readonly fieldMinutes = {
    fullDay: 1440,
    min06: 6 * 60,
    dayLimit: 1440 + 6 * 60,
  };

  constructor(
    private readonly segmentResolver: ShiftSegmentResolver,
    private readonly shiftService: ShiftService,
  ) {}

  build(params: { shift: Shift; meta: WorkDayMeta }): LabeledSegmentRange[] {
    const { shift, meta } = params;

    if (!this.shiftService.isValidShiftDuration(shift)) return [];

    const [firstPart, secondPart] = this.splitShift(shift);

    const part1 = this.segmentResolver.resolve({
      point: firstPart,
      meta,
    });

    if (!secondPart) return part1;

    const metaNextDay: WorkDayMeta = {
      ...meta,
      date: shift.end.date.toISOString().split("T")[0],
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

  private splitShift(shift: Shift): [Point, Point?] {
    const endMinutes = this.shiftService.getMinutesFromMidnight(
      shift.end.date,
      shift.start.date,
    );

    const first: Point = {
      start: this.shiftService.getMinutesFromMidnight(shift.start.date),
      end: Math.min(endMinutes, this.fieldMinutes.dayLimit),
    };

    const second: Point | undefined =
      endMinutes > this.fieldMinutes.dayLimit
        ? {
            start: this.fieldMinutes.min06,
            end: endMinutes % this.fieldMinutes.fullDay,
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
}
