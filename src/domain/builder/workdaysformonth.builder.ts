import {
  WorkDaysForMonthBuilder,
  WorkDayInfo,
  WorkDayInfoResolver,
  DateService,
} from "@/domain";
import { WorkDayType } from "@/constants";

export class DefaultWorkDaysForMonthBuilder implements WorkDaysForMonthBuilder {
  private readonly hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  constructor(
    private readonly holidayResolver: {
      resolve(params: { weekday: number; eventTitles: string[] }): WorkDayType;
    },
    private readonly workDayInfoResolver: WorkDayInfoResolver,
    private readonly dateService: DateService,
  ) {}

  build(params: {
    year: number;
    month: number;
    eventMap: Record<string, string[]>;
  }): WorkDayInfo[] {
    const { year, month, eventMap } = params;
    const daysInMonth = this.dateService.getDaysInMonth(year, month);
    const workDays: WorkDayInfo[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const formattedDate = this.dateService.formatDate(date);
      const weekday = date.getDay(); // 0 (Sun) to 6 (Sat)

      const hebrewDay = this.hebrewDays[weekday];
      const eventTitles = eventMap[formattedDate] || [];

      const typeDay = this.holidayResolver.resolve({ weekday, eventTitles });

      const row: WorkDayInfo = {
        meta: {
          date: formattedDate,
          typeDay: typeDay,
          crossDayContinuation: false,
        },
        hebrewDay: hebrewDay,
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

    const nextDayType = this.holidayResolver.resolve({
      weekday: nextMonthDate.getDay(),
      eventTitles: nextDayEvents,
    });
    workDays[workDays.length - 1].meta.crossDayContinuation =
      nextDayType === WorkDayType.SpecialFull;

    return workDays;
  }
}
