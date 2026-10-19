import { WorkDayInfoResolver } from "../resolve/workdayinfo.resolver.js";
import { DateService } from "../services/date.service.js";
import {
  CalendarEventKind,
  CalendarEvent,
  CalendarEventMap,
  DomainWorkDay,
} from "../types/types.js";
import { WorkDaysForMonthBuilder } from "../types/services.js";
import { WorkDayType } from "../constants/index.js";

export class DefaultWorkDaysForMonthBuilder implements WorkDaysForMonthBuilder {
  constructor(
    private readonly holidayResolver: {
      calculate(params: {
        weekday: number;
        events: CalendarEvent[];
      }): WorkDayType;
    },
    private readonly workDayInfoResolver: WorkDayInfoResolver,
    private readonly dateService: DateService,
  ) {}

  build(params: {
    year: number;
    month: number;
    eventMap: CalendarEventMap;
  }): DomainWorkDay[] {
    const { year, month, eventMap } = params;
    const daysInMonth = this.dateService.getDaysInMonth(year, month);
    const workDays: DomainWorkDay[] = [];
    const calendarDayTypes: Record<string, WorkDayType> = {};
    const calendarKnessetNumbers: Record<string, number> = {};
    for (const [dateKey, events] of Object.entries(eventMap)) {
      const election = events.find(
        (event) => event.kind === CalendarEventKind.KnessetElectionDay,
      );
      if (election?.knessetNumber !== undefined) {
        calendarKnessetNumbers[dateKey] = election.knessetNumber;
      }
      calendarDayTypes[dateKey] = this.holidayResolver.calculate({
        weekday: this.dateService.createDateWithTime(dateKey).getDay(),
        events,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const formattedDate = this.dateService.formatDate(date);
      const weekday = date.getDay(); // 0 (Sun) to 6 (Sat)

      const events = eventMap[formattedDate] || [];

      const typeDay = this.holidayResolver.calculate({ weekday, events });

      const holidayKey =
        typeDay !== WorkDayType.Regular
          ? events.map((event) => event.holidayKey).find(Boolean)
          : undefined;

      const row: DomainWorkDay = {
        meta: {
          date: formattedDate,
          typeDay: typeDay,
          crossDayContinuation: false,
          holidayKey,
          knessetNumber: events.find(
            (event) => event.kind === CalendarEventKind.KnessetElectionDay,
          )?.knessetNumber,
          calendarDayTypes,
          calendarKnessetNumbers,
        },
      };
      workDays[day - 1] = row;

      if (day > 1) {
        workDays[day - 2].meta.crossDayContinuation =
          this.workDayInfoResolver.isSpecialFullDay(row);
      }
    }

    const nextMonthDate = this.dateService.getNextMonthDay(year, month);
    const nextDateKey = this.dateService.formatDate(nextMonthDate);
    const nextDayEvents = eventMap[nextDateKey] || [];

    const nextDayType = this.holidayResolver.calculate({
      weekday: nextMonthDate.getDay(),
      events: nextDayEvents,
    });
    workDays[workDays.length - 1].meta.crossDayContinuation =
      nextDayType === WorkDayType.SpecialFull;

    return workDays;
  }
}
