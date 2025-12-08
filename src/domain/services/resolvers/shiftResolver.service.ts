import { LabeledSegmentRange, Point, Shift, WorkDayMeta } from "../../types/types";
import {
  WorkDayType,
} from "@/constants";
import { DateUtils } from "@/utils";


export const createShiftResolverService = () => {

  let fieldMinutes: Record<string, number> | null = null;
  let fieldShiftPercent: Record<string, number> | null = null;

  const withFieldMinutes = (minutes: Record<string, number>) => {
    fieldMinutes = minutes;
    return builder;
  }

  const withFieldShiftPercent = (percent: Record<string, number>) => {
    fieldShiftPercent = percent;
    return builder;
  }

  const buildSegmentMap = (
    specialStart: number,
    fm: Record<string, number>,
    fp: Record<string, number>
  ): Record<WorkDayType, LabeledSegmentRange[]> => {
    const { min06, min14, min17, min22, fullDay } = fm;
    const { hours50, hours20, hours100, hours150, hours200 } = fp;

    return {
      [WorkDayType.Regular]: [
        {
          point: { start: 0, end: min06 },
          percent: hours50,
          key: "hours50",
        },
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
          point: {
            start: min22,
            end: min06 + fullDay,
          },
          percent: hours50,
          key: "hours50",
        },
      ],
      [WorkDayType.SpecialPartialStart]: [
        {
          point: { start: 0, end: min06 },
          percent: hours50,
          key: "hours50",
        },
        {
          point: { start: min06, end: min17 - 1 },
          percent: hours100,
          key: "hours100",
        },
        {
          point: { start: min14, end: specialStart },
          percent: hours20,
          key: "hours20",
        },
        {
          point: { start: specialStart, end: min22 },
          percent: hours150,
          key: "shabbat150",
        },
        {
          point: {
            start: min22,
            end: min06 + fullDay,
          },
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
          point: {
            start: min22,
            end: min06 + fullDay,
          },
          percent: hours200,
          key: "shabbat200",
        },
      ],
    };

  };

  const splitTargetByDay = (target: Point, fm: Record<string, number>): [Point, Point?] => {
    const dayLimit = fm.min06 + fm.fullDay;
    const targetOne = {
      start: target.start,
      end: Math.min(target.end, dayLimit),
    };
    const targetTwo =
      target.end > dayLimit
        ? { start: fm.min06, end: target.end % fm.fullDay }
        : undefined;
    return [targetOne, targetTwo];
  };

  const findSegments = (target: Point, src: LabeledSegmentRange[]): LabeledSegmentRange[] => {
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
  };

  const shiftToNextDay = (
    segs: LabeledSegmentRange[],
    fm: Record<string, number>
  ): LabeledSegmentRange[] => segs.map(s => ({
    point: {
      start: s.point.start + fm.fullDay,
      end: s.point.end + fm.fullDay,
    },
    percent: s.percent,
    key: s.key,
  }));

  const mergeSegments = (
    a: LabeledSegmentRange[],
    b: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => [...a, ...b].sort((x, y) => x.point.start - y.point.start);

  const resolveDayRange = (
    first: Point,
    src: LabeledSegmentRange[],
    second: Point | undefined,
    fm: Record<string, number>,
    nextSrc?: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => {
    const part1 = findSegments(first, src);
    if (!second) return part1;

    const part2 = shiftToNextDay(findSegments(second, nextSrc ?? src), fm);
    return mergeSegments(part1, part2);
  };

  const handleRegular = (
    target: Point,
    regular: LabeledSegmentRange[],
    fm: Record<string, number>,
  ): LabeledSegmentRange[] => {
    const [targetOne, targetTwo] = splitTargetByDay(target, fm);
    return resolveDayRange(targetOne, regular, targetTwo, fm);
  };

  const handlePartialStart = (
    target: Point,
    map: Record<WorkDayType, LabeledSegmentRange[]>,
    fm: Record<string, number>,
  ): LabeledSegmentRange[] => {
    const [t1, t2] = splitTargetByDay(target, fm);

    return resolveDayRange(
      t1,
      map.SpecialPartialStart,
      t2,
      fm,
      map.SpecialFull,
    );
  };

  const handleSpecial = (
    target: Point,
    cross: boolean,
    map: Record<WorkDayType, LabeledSegmentRange[]>,
    fm: Record<string, number>,
  ): LabeledSegmentRange[] => {
    const [t1, t2] = splitTargetByDay(target, fm);
    const nextSrc = cross ? map.SpecialFull : map.Regular;
    return resolveDayRange(
      t1,
      map.SpecialFull,
      t2,
      fm,
      nextSrc,
    );
  };

  const build = () => {
    if(!fieldMinutes || !fieldShiftPercent) 
      throw new Error("Missing configuration for ShiftResolverService");

    const fm = fieldMinutes;
    const fp = fieldShiftPercent;
    const { getSpecialStartMinutes } = DateUtils();

    return {
      resolve: (shift: Shift, meta: WorkDayMeta): LabeledSegmentRange[] => {
        const start = shift.start.minutes;
        const end = shift.end.minutes;

        if(start >= end) return [];

        const specialStart = getSpecialStartMinutes(meta.date);
        const segmentMap = buildSegmentMap(specialStart, fm, fp);

        const target = { start, end };

        switch (meta.typeDay) {
          case WorkDayType.Regular:
            return handleRegular(target, segmentMap.Regular, fm);
          case WorkDayType.SpecialPartialStart:
            return handlePartialStart(target, segmentMap, fm);
          case WorkDayType.SpecialFull:
            return handleSpecial(target, meta.crossDayContinuation, segmentMap, fm);
          default:
            return [];
        }
      },
    };
  };

  const builder = { withFieldMinutes, withFieldShiftPercent, build };

  return builder;
}
