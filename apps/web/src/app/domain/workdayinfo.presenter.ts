import type { DateService, DayInfoResolver, DomainWorkDay } from "@shiftly/domain";

export interface DayInfoPresenter extends DayInfoResolver {
  formatWorkDayLabel(day: DomainWorkDay, weekdayLabel: string): string;
}

export class WorkDayInfoPresenter implements DayInfoPresenter {
  constructor(
    private readonly resolver: DayInfoResolver,
    private readonly dateService: DateService,
  ) {}

  isSpecialFullDay(day: DomainWorkDay): boolean {
    return this.resolver.isSpecialFullDay(day);
  }

  isPartialHolidayStart(day: DomainWorkDay): boolean {
    return this.resolver.isPartialHolidayStart(day);
  }

  hasCrossDayContinuation(day: DomainWorkDay): boolean {
    return this.resolver.hasCrossDayContinuation(day);
  }

  formatWorkDayLabel(day: DomainWorkDay, weekdayLabel: string): string {
    const dayNumber = this.dateService.getDayOfMonth(day.meta.date);
    return `${weekdayLabel}-${dayNumber}`;
  }
}
