import { WorkDayType } from "@/constants";
import { DayInfoResolver, WorkDayInfo } from "@/domain";
import { DateService } from "@/domain/services/date.service";

export class WorkDayInfoResolver implements DayInfoResolver {
  constructor(private readonly dateService: DateService) {}

  isSpecialFullDay(day: WorkDayInfo): boolean {
    return day.meta.typeDay === WorkDayType.SpecialFull;
  }

  isPartialHolidayStart(day: WorkDayInfo): boolean {
    return day.meta.typeDay === WorkDayType.SpecialPartialStart;
  }

  hasCrossDayContinuation(day: WorkDayInfo): boolean {
    return day.meta.crossDayContinuation === true;
  }

  formatWorkDayLabel(day: WorkDayInfo, weekdayLabel: string): string {
    const dayNumber = this.dateService.getDayOfMonth(day.meta.date);
    return `${weekdayLabel}-${dayNumber}`;
  }
}
