import { Weekend, WorkDayType } from "../constants/index.js";
import { CalendarEventKind, type CalendarEvent } from "../types/types.js";
import type { HolidayCalculator } from "../types/services.js";

export class DefaultHolidayCalculator implements HolidayCalculator {
  calculate(params: { weekday: number; events: CalendarEvent[] }): WorkDayType {
    const { weekday, events } = params;

    if (
      weekday === Weekend.SATURDAY ||
      events.some((event) => event.kind === CalendarEventKind.PaidHoliday)
    )
      return WorkDayType.SpecialFull;

    if (
      events.some(
        (event) => event.kind === CalendarEventKind.PartialHolidayStart,
      ) ||
      weekday === Weekend.FRIDAY
    )
      return WorkDayType.SpecialPartialStart;

    return WorkDayType.Regular;
  }
}
