import { LabeledSegmentRange, Point, WorkDayMeta } from "../types/types";
import {
  fieldMinutes as defaultFieldMinutes,
  fieldShiftPercent as defaultFieldShiftPercent,
  WorkDayType,
} from "@/constants";
import { DateUtils } from "@/utils";

export const segmentResolver = (
  fieldMinutes: Record<string, number> = defaultFieldMinutes,
  fieldShiftPercent: Record<string, number> = defaultFieldShiftPercent,
) => {
  const { min06, min14, min17, min22, fullDay } = fieldMinutes;
  const { hours50, hours20, hours100, hours150, hours200 } = fieldShiftPercent;

  const buildSegmentMap = (
    specialStart: number,
  ): Record<WorkDayType, LabeledSegmentRange[]> => {
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

  const findSegments = (
    target: Point,
    source: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => {
    const starts = source.map((s) => s.point.start);
    const ends = source.map((s) => s.point.end);

    const i = starts.filter((s) => s <= target.start).length - 1;
    const j = ends.findIndex((e) => e >= target.end);

    if (i === -1 || j === -1 || i > j) return [];

    const result: LabeledSegmentRange[] = [];
    for (let k = i; k <= j; k++) {
      const { point, percent, key } = source[k];
      const segStart = Math.max(point.start, target.start);
      const segEnd = Math.min(point.end, target.end);
      if (segStart < segEnd) {
        result.push({ point: { start: segStart, end: segEnd }, percent, key });
      }
    }
    return result;
  };

  const shiftSegmentsToNextDay = (
    segments: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => {
    return segments.map(({ point, percent, key }) => ({
      point: {
        start: point.start + fullDay,
        end: point.end + fullDay,
      },
      percent,
      key,
    }));
  };

  const mergeSegments = (
    a: LabeledSegmentRange[],
    b: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => {
    return [...a, ...b].sort((x, y) => x.point.start - y.point.start);
  };

  const resolveDayRange = (
    first: Point,
    source: LabeledSegmentRange[],
    second?: Point,
    nextDaySource?: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => {
    const part1 = findSegments(first, source);
    if (!second) return part1;

    const part2 = shiftSegmentsToNextDay(
      findSegments(second, nextDaySource ?? source),
    );
    return mergeSegments(part1, part2);
  };

  const splitTargetByDay = (target: Point): [Point, Point?] => {
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
  };

  const handleRegular = (
    target: Point,
    regular: LabeledSegmentRange[],
  ): LabeledSegmentRange[] => {
    const [targetOne, targetTwo] = splitTargetByDay(target);
    return resolveDayRange(targetOne, regular, targetTwo);
  };

  const handlePartialStart = (
    target: Point,
    segmentMap: Record<WorkDayType, LabeledSegmentRange[]>,
  ): LabeledSegmentRange[] => {
    const [targetOne, targetTwo] = splitTargetByDay(target);

    return resolveDayRange(
      targetOne,
      segmentMap.SpecialPartialStart,
      targetTwo,
      segmentMap.SpecialFull,
    );
  };

  const handleSpecial = (
    target: Point,
    cross: boolean,
    segmentMap: Record<WorkDayType, LabeledSegmentRange[]>,
  ): LabeledSegmentRange[] => {
    const [targetOne, targetTwo] = splitTargetByDay(target);
    const nextSource = cross ? segmentMap.SpecialFull : segmentMap.Regular;
    return resolveDayRange(
      targetOne,
      segmentMap.SpecialFull,
      targetTwo,
      nextSource,
    );
  };

  return ({
    target,
    meta,
  }: {
    target: Point;
    meta: WorkDayMeta;
  }): LabeledSegmentRange[] => {
    const specialStart = DateUtils.getSpecialStartMinutes(meta.date);
    const segmentMap = buildSegmentMap(specialStart);

    switch (meta.typeDay) {
      case WorkDayType.Regular:
        return handleRegular(target, segmentMap.Regular);
      case WorkDayType.SpecialPartialStart:
        return handlePartialStart(target, segmentMap);
      case WorkDayType.SpecialFull:
        return handleSpecial(target, meta.crossDayContinuation, segmentMap);
      default:
        return [];
    }
  };
};
