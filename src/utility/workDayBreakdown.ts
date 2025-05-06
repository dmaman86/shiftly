import { RegularBreakdown, WorkDayPayMap, WorkDayType } from "@/models";

type SegmentRange = {
  start: number;
  end: number;
  percent: number;
};

type Point = { start: number; end: number };

type WorkDayMeta = {
  date: string;
  typeDay: WorkDayType;
  crossDayContinuation: boolean;
};

export const calculateWorkDayBreakdown = (() => {
  const MID_TIER = 2.0; // 2 hours

  const MINUTES_IN_HOUR = 60;
  const MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;

  const hours = {
    min06: 6 * MINUTES_IN_HOUR, // 6:00
    min14: 14 * MINUTES_IN_HOUR, // 14:00
    min17: 17 * MINUTES_IN_HOUR, // 17:00
    min18: 18 * MINUTES_IN_HOUR, // 18:00
    min22: 22 * MINUTES_IN_HOUR, // 22:00
  };

  const intersecting: SegmentRange[] = [
    { start: 0, end: hours.min06, percent: 0.5 },
    { start: hours.min06, end: hours.min17, percent: 1 },
    { start: hours.min14, end: hours.min22, percent: 0.2 },
    { start: hours.min22, end: hours.min06 + MINUTES_IN_DAY, percent: 0.5 },
  ];

  const specialIntersecting: SegmentRange[] = [
    { start: 0, end: hours.min06, percent: 2 },
    { start: hours.min06, end: hours.min22, percent: 1.5 },
    { start: hours.min22, end: hours.min06 + MINUTES_IN_DAY, percent: 2 },
  ];

  const getSpecialStartMinutes = (date: string): number => {
    const d = new Date(date);
    const offsetMinutes = d.getTimezoneOffset();
    return -offsetMinutes / MINUTES_IN_HOUR === 3 ? hours.min18 : hours.min17;
  };

  const findSegments = (
    target: Point,
    source: SegmentRange[],
  ): SegmentRange[] => {
    const starts = source.map((s) => s.start);
    const ends = source.map((s) => s.end);

    const i = starts.filter((s) => s <= target.start).length - 1;
    const j = ends.findIndex((e) => e >= target.end);

    if (i === -1 || j === -1 || i > j) return [];

    const result: SegmentRange[] = [];
    for (let k = i; k <= j; k++) {
      const s = source[k];
      const segStart = Math.max(s.start, target.start);
      const segEnd = Math.min(s.end, target.end);
      if (segStart < segEnd) {
        result.push({ start: segStart, end: segEnd, percent: s.percent });
      }
    }
    return result;
  };

  const shiftSegmentsToNextDay = (segments: SegmentRange[]): SegmentRange[] =>
    segments.map(({ start, end, percent }) => ({
      start: start + MINUTES_IN_DAY,
      end: end + MINUTES_IN_DAY,
      percent,
    }));

  const mergeSegments = (
    a: SegmentRange[],
    b: SegmentRange[],
  ): SegmentRange[] => [...a, ...b].sort((x, y) => x.start - y.start);

  const resolveDayRange = (
    first: Point,
    source: SegmentRange[],
    second?: Point,
    nextDaySource?: SegmentRange[],
  ): SegmentRange[] => {
    const part1 = findSegments(first, source);

    if (!second) return part1;

    const source2 = nextDaySource ?? source;
    const part2 = shiftSegmentsToNextDay(findSegments(second, source2));

    return mergeSegments(part1, part2);
  };

  const resolveSpecialPercents = (
    target: Point,
    meta: WorkDayMeta,
  ): SegmentRange[] => {
    const fullDayLimit = hours.min06 + MINUTES_IN_DAY;
    const isPartial = meta.typeDay === WorkDayType.SpecialPartialStart;
    const isRegular = meta.typeDay === WorkDayType.Regular;

    if (isRegular) {
      const targetOne = {
        start: target.start,
        end: Math.min(target.end, fullDayLimit),
      };
      const targetTwo =
        target.end > fullDayLimit
          ? { start: hours.min06, end: target.end % MINUTES_IN_DAY }
          : undefined;
      return resolveDayRange(targetOne, intersecting, targetTwo);
    }
    if (isPartial) {
      const specialStart = getSpecialStartMinutes(meta.date);
      if (target.end <= specialStart) return findSegments(target, intersecting);
      if (target.start >= specialStart) {
        const targetOne = {
          start: target.start,
          end: Math.min(target.end, fullDayLimit),
        };
        const targetTwo =
          target.end > fullDayLimit
            ? { start: hours.min06, end: target.end % MINUTES_IN_DAY }
            : undefined;
        return resolveDayRange(targetOne, specialIntersecting, targetTwo);
      }

      const targetOne = { start: target.start, end: specialStart };
      const targetTwo = { start: specialStart, end: target.end };
      return resolveDayRange(
        targetOne,
        intersecting,
        targetTwo,
        specialIntersecting,
      );
    }

    const targetOne = {
      start: target.start,
      end: Math.min(target.end, fullDayLimit),
    };
    const targetTwo =
      target.end > fullDayLimit
        ? { start: hours.min06, end: target.end % MINUTES_IN_DAY }
        : undefined;

    return resolveDayRange(
      targetOne,
      specialIntersecting,
      targetTwo,
      meta.crossDayContinuation ? specialIntersecting : intersecting,
    );
  };

  const calculateRegularBreakdown = (
    target: Point,
    standardHours: number,
    breakdown: RegularBreakdown,
  ): void => {
    const totalHours = (target.end - target.start) / 60;
    let remaining = totalHours;

    const { hours100, hours125 } = breakdown;

    if (standardHours - hours100.hours > 0) {
      const toAdd100 = Math.min(standardHours - hours100.hours, remaining);
      breakdown.hours100.hours += toAdd100;
      remaining -= toAdd100;
    }
    if (MID_TIER - hours125.hours > 0) {
      const toAdd125 = Math.min(MID_TIER - hours125.hours, remaining);
      breakdown.hours125.hours += toAdd125;
      remaining -= toAdd125;
    }
    breakdown.hours150.hours += remaining;
  };

  const updateBreakdown = (
    segments: SegmentRange[],
    breakdown: WorkDayPayMap,
  ): void => {
    for (const { start, end, percent } of segments) {
      const hours = (end - start) / 60;
      switch (percent) {
        case 0.2:
          breakdown.regular.hours20.hours += hours;
          break;
        case 0.5:
          breakdown.regular.hours50.hours += hours;
          break;
        case 1.5:
          breakdown.special.shabbat150.hours += hours;
          breakdown.special.extra100Shabbat.hours += hours;
          break;
        case 2:
          breakdown.special.shabbat200.hours += hours;
          breakdown.special.extra100Shabbat.hours += hours;
          break;
      }
    }
  };

  return (
    start: number,
    end: number,
    standardHours: number,
    breakdown: WorkDayPayMap,
    meta: WorkDayMeta,
  ): void => {
    if (start >= end) return;

    const totalHours = (end - start) / 60;

    breakdown.totalHours += totalHours;
    const segments = resolveSpecialPercents({ start, end }, meta);
    updateBreakdown(segments, breakdown);

    const isRegular = meta.typeDay === WorkDayType.Regular;
    const isPartial = meta.typeDay === WorkDayType.SpecialPartialStart;
    const isSpecial = meta.typeDay === WorkDayType.SpecialFull;

    if (isRegular) {
      calculateRegularBreakdown(
        { start, end },
        standardHours,
        breakdown.regular,
      );
    }
    if (isPartial) {
      const specialStart = getSpecialStartMinutes(meta.date);
      if (start < specialStart) {
        const partialEnd = Math.min(end, specialStart);
        calculateRegularBreakdown(
          { start, end: partialEnd },
          standardHours,
          breakdown.regular,
        );
      }
    }
    if (isSpecial && !meta.crossDayContinuation) {
      const extra100 = breakdown.special.extra100Shabbat.hours;
      const remaining = totalHours - extra100;

      if (remaining > 0) breakdown.regular.hours150.hours += remaining;
    }
  };
})();

// const resolveSpecialPercents = (() => {
//   const getSpecialStartMinutes = (date: string): number => {
//     const d = new Date(date);
//     const offsetMinutes = d.getTimezoneOffset();
//     return -offsetMinutes / 60 === 3 ? 18 * 60 : 17 * 60;
//   };
//
//   const intersecting: SegmentRange[] = [
//     { start: 0, end: 360, percent: 0.5 },
//     { start: 360, end: 1020, percent: 1 },
//     { start: 840, end: 1320, percent: 0.2 },
//     { start: 1320, end: 1800, percent: 0.5 },
//   ];
//
//   const specialIntersecting: SegmentRange[] = [
//     { start: 0, end: 360, percent: 2 },
//     { start: 360, end: 1320, percent: 1.5 },
//     { start: 1320, end: 1800, percent: 2 },
//   ];
//
//   const findSegments = (
//     target: { start: number; end: number },
//     source: SegmentRange[],
//   ): SegmentRange[] => {
//     const result: SegmentRange[] = [];
//
//     let currentEnd = target.end;
//
//     let i = source.findIndex(
//       (s) => s.start <= currentEnd && currentEnd <= s.end,
//     );
//     if (i === -1) return [];
//
//     while (i >= 0 && currentEnd > target.start) {
//       const s = source[i];
//       const segStart = Math.max(s.start, target.start);
//       const segEnd = currentEnd;
//       if (segStart < segEnd) {
//         result.push({ start: segStart, end: segEnd, percent: s.percent });
//       }
//       currentEnd = segStart;
//       i--;
//     }
//
//     return result.sort((a, b) => a.start - b.start);
//   };
//
//   const shiftSegmentsToNextDay = (segments: SegmentRange[]): SegmentRange[] =>
//     segments.map(({ start, end, percent }) => ({
//       start: start + 1440,
//       end: end + 1440,
//       percent,
//     }));
//
//   const resolveFullRange = (
//     target: { start: number; end: number },
//     currentDaySegments: SegmentRange[],
//     nextDaySegments: SegmentRange[] = [],
//   ): SegmentRange[] => {
//     if (target.end <= 1800) return findSegments(target, currentDaySegments);
//
//     const segmentsForNextDay = nextDaySegments.length
//       ? nextDaySegments
//       : currentDaySegments;
//     const part1 = findSegments(
//       { start: target.start, end: 1800 },
//       currentDaySegments,
//     );
//     const part2Raw = findSegments(
//       { start: 360, end: target.end % 1440 },
//       segmentsForNextDay,
//     );
//     const part2 = shiftSegmentsToNextDay(part2Raw);
//
//     return [...part1, ...part2].sort((a, b) => a.start - b.start);
//   };
//
//   const resolveBySpecialStart = (
//     target: { start: number; end: number },
//     specialStart: number,
//   ): SegmentRange[] => {
//     if (target.end <= specialStart) return findSegments(target, intersecting);
//     if (target.start >= specialStart)
//       return findSegments(target, specialIntersecting);
//
//     const part1 = findSegments(
//       { start: target.start, end: specialStart },
//       intersecting,
//     );
//     const part2 = findSegments(
//       { start: specialStart, end: target.end },
//       specialIntersecting,
//     );
//     return [...part1, ...part2];
//   };
//
//   return (
//     target: { start: number; end: number },
//     meta: {
//       date: string;
//       specialDay: boolean;
//       startFullDayPay: boolean;
//       endFullDayPay: boolean;
//     },
//   ): SegmentRange[] => {
//     if (!meta.specialDay) {
//       return resolveFullRange(target, intersecting);
//     }
//
//     const specialStart = getSpecialStartMinutes(meta.date);
//
//     if (!meta.startFullDayPay) {
//       if (target.end <= 1800) {
//         return resolveBySpecialStart(target, specialStart);
//       }
//
//       const part1 = resolveBySpecialStart(
//         { start: target.start, end: 1800 },
//         specialStart,
//       );
//       const nextDaySegments = meta.endFullDayPay
//         ? specialIntersecting
//         : intersecting;
//       const part2Raw = findSegments(
//         { start: 360, end: target.end % 1440 },
//         nextDaySegments,
//       );
//       const part2 = shiftSegmentsToNextDay(part2Raw);
//
//       return [...part1, ...part2].sort((a, b) => a.start - b.start);
//     }
//
//     return resolveFullRange(
//       target,
//       specialIntersecting,
//       meta.endFullDayPay ? specialIntersecting : intersecting,
//     );
//   };
// })();
