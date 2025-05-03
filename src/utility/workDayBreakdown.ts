import { RegularBreakdown, WorkDayPayMap } from "@/models";

type SegmentRange = {
  start: number;
  end: number;
  percent: number;
};

const resolveSpecialPercents = (() => {
  const getSpecialStartMinutes = (date: string): number => {
    const d = new Date(date);
    const offsetMinutes = d.getTimezoneOffset();
    return -offsetMinutes / 60 === 3 ? 18 * 60 : 17 * 60;
  };

  const intersecting: SegmentRange[] = [
    { start: 0, end: 360, percent: 0.5 },
    { start: 360, end: 1020, percent: 1 },
    { start: 840, end: 1320, percent: 0.2 },
    { start: 1320, end: 1800, percent: 0.5 },
  ];

  const specialIntersecting: SegmentRange[] = [
    { start: 0, end: 360, percent: 2 },
    { start: 360, end: 1320, percent: 1.5 },
    { start: 1320, end: 1800, percent: 2 },
  ];

  const findSegments = (
    target: { start: number; end: number },
    source: SegmentRange[],
  ): SegmentRange[] => {
    const result: SegmentRange[] = [];

    let currentEnd = target.end;

    let i = source.findIndex(
      (s) => s.start <= currentEnd && currentEnd <= s.end,
    );
    if (i === -1) return [];

    while (i >= 0 && currentEnd > target.start) {
      const s = source[i];
      const segStart = Math.max(s.start, target.start);
      const segEnd = currentEnd;
      if (segStart < segEnd) {
        result.push({ start: segStart, end: segEnd, percent: s.percent });
      }
      currentEnd = segStart;
      i--;
    }

    return result.sort((a, b) => a.start - b.start);
  };

  const shiftSegmentsToNextDay = (segments: SegmentRange[]): SegmentRange[] =>
    segments.map(({ start, end, percent }) => ({
      start: start + 1440,
      end: end + 1440,
      percent,
    }));

  const resolveFullRange = (
    target: { start: number; end: number },
    currentDaySegments: SegmentRange[],
    nextDaySegments: SegmentRange[] = [],
  ): SegmentRange[] => {
    if (target.end <= 1800) return findSegments(target, currentDaySegments);

    const segmentsForNextDay = nextDaySegments.length
      ? nextDaySegments
      : currentDaySegments;
    const part1 = findSegments(
      { start: target.start, end: 1800 },
      currentDaySegments,
    );
    const part2Raw = findSegments(
      { start: 360, end: target.end % 1440 },
      segmentsForNextDay,
    );
    const part2 = shiftSegmentsToNextDay(part2Raw);

    return [...part1, ...part2].sort((a, b) => a.start - b.start);
  };

  const resolveBySpecialStart = (
    target: { start: number; end: number },
    specialStart: number,
  ): SegmentRange[] => {
    if (target.end <= specialStart) return findSegments(target, intersecting);
    if (target.start >= specialStart)
      return findSegments(target, specialIntersecting);

    const part1 = findSegments(
      { start: target.start, end: specialStart },
      intersecting,
    );
    const part2 = findSegments(
      { start: specialStart, end: target.end },
      specialIntersecting,
    );
    return [...part1, ...part2];
  };

  return (
    target: { start: number; end: number },
    meta: {
      date: string;
      specialDay: boolean;
      startFullDayPay: boolean;
      endFullDayPay: boolean;
    },
  ): SegmentRange[] => {
    if (!meta.specialDay) {
      return resolveFullRange(target, intersecting);
    }

    const specialStart = getSpecialStartMinutes(meta.date);

    if (!meta.startFullDayPay) {
      if (target.end <= 1800) {
        return resolveBySpecialStart(target, specialStart);
      }

      const part1 = resolveBySpecialStart(
        { start: target.start, end: 1800 },
        specialStart,
      );
      const nextDaySegments = meta.endFullDayPay
        ? specialIntersecting
        : intersecting;
      const part2Raw = findSegments(
        { start: 360, end: target.end % 1440 },
        nextDaySegments,
      );
      const part2 = shiftSegmentsToNextDay(part2Raw);

      return [...part1, ...part2].sort((a, b) => a.start - b.start);
    }

    return resolveFullRange(
      target,
      specialIntersecting,
      meta.endFullDayPay ? specialIntersecting : intersecting,
    );
  };
})();

export const calculateWorkDayBreakdown = (() => {
  const MID_TIER = 2.0; // 2 hours

  const calculateRegularBreakdown = (
    start: number,
    end: number,
    standardHours: number,
    breakdown: RegularBreakdown,
  ): void => {
    const totalMinutes = end - start;
    const totalHours = totalMinutes / 60;
    let remaining = totalHours;

    console.log(standardHours);

    if (standardHours - breakdown.hours100.hours > 0) {
      const toAdd100 = Math.min(
        standardHours - breakdown.hours100.hours,
        remaining,
      );
      breakdown.hours100.hours += toAdd100;
      remaining -= toAdd100;
    }
    if (MID_TIER - breakdown.hours125.hours > 0) {
      const toAdd125 = Math.min(MID_TIER - breakdown.hours125.hours, remaining);
      breakdown.hours125.hours += toAdd125;
      remaining -= toAdd125;
    }
    // if (remaining > 0) {
    breakdown.hours150.hours += remaining;
    // }
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
    meta: {
      date: string;
      specialDay: boolean;
      fullDayPay: boolean;
      specialNextDay: boolean;
    },
  ): void => {
    if (start >= end) return;

    const totalMinutes = end - start;
    const totalHours = totalMinutes / 60;

    breakdown.totalHours += totalHours;
    const segments = resolveSpecialPercents(
      { start, end },
      {
        date: meta.date,
        specialDay: meta.specialDay,
        startFullDayPay: meta.fullDayPay,
        endFullDayPay: meta.specialNextDay,
      },
    );
    updateBreakdown(segments, breakdown);

    if (!meta.specialDay || !meta.fullDayPay) {
      calculateRegularBreakdown(start, end, standardHours, breakdown.regular);
    } else {
      const remaining = totalHours - breakdown.special.extra100Shabbat.hours;
      if (remaining > 0 && !meta.specialNextDay) {
        breakdown.regular.hours150.hours += remaining;
      }
    }
  };
})();
