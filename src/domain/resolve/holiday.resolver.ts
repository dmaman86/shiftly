import { Weekend, WorkDayType } from "@/constants";
import {
  CalendarEventKind,
  type CalendarEvent,
  type HolidayResolver,
} from "@/domain";

export class HolidayResolverService implements HolidayResolver {
  resolve(params: { weekday: number; events: CalendarEvent[] }): WorkDayType {
    const { weekday, events } = params;

    if (
      weekday === Weekend.SATURDAY ||
      events.some((event) => event.kind === CalendarEventKind.PaidHoliday)
    )
      return WorkDayType.SpecialFull;

    if (
      events.some(
        (event) => event.kind === CalendarEventKind.PartialHolidayStart,
      ) || weekday === Weekend.FRIDAY
    )
      return WorkDayType.SpecialPartialStart;

    return WorkDayType.Regular;
  }
}
