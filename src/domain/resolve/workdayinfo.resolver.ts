import { WorkDayType } from "@/domain/constants";
import { DayInfoResolver, DomainWorkDay } from "../types/types";
import { DateService } from "../services/date.service";

export class WorkDayInfoResolver implements DayInfoResolver {
  constructor(private readonly dateService: DateService) {}

  isSpecialFullDay(day: DomainWorkDay): boolean {
    return day.meta.typeDay === WorkDayType.SpecialFull;
  }

  isPartialHolidayStart(day: DomainWorkDay): boolean {
    return day.meta.typeDay === WorkDayType.SpecialPartialStart;
  }

  hasCrossDayContinuation(day: DomainWorkDay): boolean {
    return day.meta.crossDayContinuation === true;
  }

  formatWorkDayLabel(day: DomainWorkDay, weekdayLabel: string): string {
    const dayNumber = this.dateService.getDayOfMonth(day.meta.date);
    return `${weekdayLabel}-${dayNumber}`;
  }
}
