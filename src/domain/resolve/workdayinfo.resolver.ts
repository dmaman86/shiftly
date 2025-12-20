import { WorkDayType } from "@/constants";
import { DayInfoResolver, WorkDayInfo } from "../types/types";

export class WorkDayInfoResolver implements DayInfoResolver {
  isSpecialFullDay(day: WorkDayInfo): boolean {
    return day.meta.typeDay === WorkDayType.SpecialFull;
  }

  isPartialHolidayStart(day: WorkDayInfo): boolean {
    return day.meta.typeDay === WorkDayType.SpecialPartialStart;
  }

  hasCrossDayContinuation(day: WorkDayInfo): boolean {
    return day.meta.crossDayContinuation === true;
  }

  formatHebrewWorkDay(day: WorkDayInfo): string {
    const dayNumber = new Date(day.meta.date).toLocaleDateString("he-IL", {
      day: "2-digit",
    });
    return `${day.hebrewDay}-${dayNumber}`;
  }
}
