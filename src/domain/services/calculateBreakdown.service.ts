import { WorkDayStatus, WorkDayType } from "@/constants";
import { Segment, WorkDayMeta, WorkDayPayMap } from "../types/types";
import { breakdownService } from "./breakdown.service";
import { workDayBreakdownService } from "./workDayBreakdown.service";

export const calculateBreakdown = (
  segments: Segment[],
  meta: WorkDayMeta,
  standardHours: number,
  statusDay: WorkDayStatus,
): WorkDayPayMap => {
  let breakdown: WorkDayPayMap = breakdownService.initBreakdown();

  if (statusDay !== WorkDayStatus.normal) {
    breakdown.hours100Sick.hours =
      statusDay === WorkDayStatus.sick ? standardHours : 0;
    breakdown.hours100Vacation.hours =
      statusDay === WorkDayStatus.vacation ? standardHours : 0;
    breakdown.totalHours = standardHours;
    return breakdown;
  }

  segments.forEach(({ start, end }) => {
    const partial = workDayBreakdownService.calculateBreakdownHours(
      { start: start.minutes, end: end.minutes },
      meta,
    );
    breakdown = breakdownService.mergeBreakdowns(
      breakdown,
      partial,
      breakdownService.sumSegments,
    );
  });

  const isSpecial = meta.typeDay === WorkDayType.SpecialFull;
  const regularHoursToCalculate =
    breakdown.totalHours - breakdown.extra100Shabbat.hours;

  if (isSpecial) {
    breakdown.regular.hours150.hours = regularHoursToCalculate;
  } else {
    const partialRegular = workDayBreakdownService.distributeRegularHours(
      regularHoursToCalculate,
      standardHours,
    );
    breakdown = breakdownService.mergeBreakdowns(
      breakdown,
      partialRegular,
      breakdownService.sumSegments,
    );
  }

  return breakdown;
};
