import {
  ExtraBreakdown,
  LabeledSegmentRange,
  Point,
  SpecialBreakdown,
  WorkDayMeta,
  WorkDayPayMap,
} from "../types/types";
import { segmentResolver } from "./segmentResolver.service";
import { breakdownService } from "./breakdown.service";

export const workDayBreakdownService = (() => {
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
    const breakdown = breakdownService.initBreakdown();
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
    const breakdown = breakdownService.initBreakdown();

    if (point.start >= point.end) return breakdown;

    const totalHours = (point.end - point.start) / 60;
    breakdown.totalHours += totalHours;

    const segments = segmentResolver({ target: point, meta });
    buildExtraBySegments(segments, breakdown);
    return breakdown;
  };

  return { calculateBreakdownHours, distributeRegularHours };
})();

// export const workDayBreakdownService = (() => {
//   const updateBreakdown = (
//     segments: LabeledSegmentRange[],
//     breakdown: WorkDayPayMap,
//   ): void => {
//     for (const { point, key } of segments) {
//       const hours = (point.end - point.start) / 60;
//       if (key in breakdown.extra) {
//         breakdown.extra[key as keyof ExtraBreakdown].hours += hours;
//       } else if (key in breakdown.special) {
//         breakdown.special[key as keyof SpecialBreakdown].hours += hours;
//         breakdown.extra100Shabbat.hours += hours;
//       }
//     }
//   };
//
//   const distributeRegularHours = (
//     totalHours: number,
//     standardHours: number,
//     breakdown: RegularBreakdown,
//   ): void => {
//     const MID_TIER = 2.0; // 2 hours
//     let remaining = totalHours;
//     const { hours100, hours125 } = breakdown;
//
//     if (standardHours - hours100.hours > 0) {
//       const toAdd100 = Math.min(standardHours - hours100.hours, remaining);
//       breakdown.hours100.hours += toAdd100;
//       remaining -= toAdd100;
//     }
//     if (MID_TIER - hours125.hours > 0) {
//       const toAdd125 = Math.min(MID_TIER - hours125.hours, remaining);
//       breakdown.hours125.hours += toAdd125;
//       remaining -= toAdd125;
//     }
//     breakdown.hours150.hours += remaining;
//   };
//
//   return (
//     point: Point,
//     standardHours: number,
//     breakdown: WorkDayPayMap,
//     meta: WorkDayMeta,
//     statusDay: WorkDayStatus,
//   ): void => {
//     if (point.start >= point.end) return;
//
//     const totalHours = (point.end - point.start) / 60;
//     breakdown.totalHours += totalHours;
//
//     if (
//       statusDay === WorkDayStatus.sick ||
//       statusDay === WorkDayStatus.vacation
//     ) {
//       breakdown.hours100Sick.hours =
//         statusDay === WorkDayStatus.sick ? totalHours : 0;
//       breakdown.hours100Vacation.hours =
//         statusDay === WorkDayStatus.vacation ? totalHours : 0;
//       return;
//     }
//
//     const segments = segmentResolver({ target: point, meta });
//     updateBreakdown(segments, breakdown);
//
//     const isSpecial = meta.typeDay === WorkDayType.SpecialFull;
//     const regularHoursToCalculate =
//       totalHours - breakdown.extra100Shabbat.hours;
//
//     distributeRegularHours(
//       regularHoursToCalculate,
//       standardHours,
//       breakdown.regular,
//     );
//
//     if (isSpecial && !meta.crossDayContinuation) {
//       const extra = totalHours - breakdown.extra100Shabbat.hours;
//       if (extra > 0) breakdown.regular.hours150.hours += extra;
//     }
//   };
// })();
