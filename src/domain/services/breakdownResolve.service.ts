import { WorkDayStatus, WorkDayType } from "@/constants";
import {
  ExtraBreakdown,
  LabeledSegmentRange,
  Point,
  Segment,
  SpecialBreakdown,
  WorkDayMeta,
  WorkDayPayMap,
} from "../types/types";
import { breakdownService } from "./breakdown.service";
import { segmentResolver } from "./segmentResolver.service";

export const breakdownResolveService = (
  breakService: ReturnType<typeof breakdownService> = breakdownService(),
  segmentRes: ReturnType<typeof segmentResolver> = segmentResolver(),
) => {
  const buildExtraBySegments = (
    segments: LabeledSegmentRange[],
    breakdown: WorkDayPayMap,
  ): void => {
    for (const { point, key } of segments) {
      const hours = (point.end - point.start) / 60;
      if (key in breakdown.extra) {
        breakdown.extra[key as keyof ExtraBreakdown].hours += hours;
      } else if (key in breakdown.special) {
        breakdown.special[key as keyof SpecialBreakdown].hours += hours;
        breakdown.extra100Shabbat.hours += hours;
      }
    }
  };

  const distributeRegularHours = (
    totalHours: number,
    standardHours: number,
  ): WorkDayPayMap => {
    const breakdown = breakService.initBreakdown({});
    const MID_TIER = 2; // 2 hours

    let remaining = totalHours;

    const overflow150 = Math.max(totalHours - (standardHours + MID_TIER), 0);
    breakdown.regular.hours150.hours = overflow150;
    remaining -= overflow150;

    const overflow125 = Math.max(remaining - standardHours, 0);
    breakdown.regular.hours125.hours = overflow125;
    remaining -= overflow125;

    breakdown.regular.hours100.hours = remaining;
    return breakdown;
  };

  const calculateBreakdownHours = (
    point: Point,
    meta: WorkDayMeta,
  ): WorkDayPayMap => {
    const breakdown = breakService.initBreakdown({});

    if (point.start >= point.end) return breakdown;

    const totalHours = (point.end - point.start) / 60;
    breakdown.totalHours += totalHours;

    const segments = segmentRes({ target: point, meta });
    buildExtraBySegments(segments, breakdown);
    return breakdown;
  };

  const calculateBreakdown = (
    segments: Segment[],
    meta: WorkDayMeta,
    standardHours: number,
    statusDay: WorkDayStatus,
  ): WorkDayPayMap => {
    let breakdown: WorkDayPayMap = breakService.initBreakdown({});

    if (statusDay !== WorkDayStatus.normal) {
      breakdown.hours100Sick.hours =
        statusDay === WorkDayStatus.sick ? standardHours : 0;
      breakdown.hours100Vacation.hours =
        statusDay === WorkDayStatus.vacation ? standardHours : 0;
      breakdown.totalHours = standardHours;
      return breakdown;
    }

    segments.forEach(({ start, end }) => {
      const partial = calculateBreakdownHours(
        { start: start.minutes, end: end.minutes },
        meta,
      );
      breakdown = breakService.mergeBreakdowns(
        breakdown,
        partial,
        breakService.sumSegments,
      );
    });

    const isSpecial = meta.typeDay === WorkDayType.SpecialFull;
    const regularHoursToCalculate =
      breakdown.totalHours - breakdown.extra100Shabbat.hours;

    if (isSpecial) {
      breakdown.regular.hours150.hours = regularHoursToCalculate;
    } else {
      const partialRegular = distributeRegularHours(
        regularHoursToCalculate,
        standardHours,
      );
      breakdown = breakService.mergeBreakdowns(
        breakdown,
        partialRegular,
        breakService.sumSegments,
      );
    }
    return breakdown;
  };

  return {
    calculateBreakdown,
    calculateBreakdownHours,
    buildExtraBySegments,
    distributeRegularHours,
  };
};
