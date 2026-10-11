import { WorkDayType } from "../constants/index.js";
import { DayInfoResolver, DomainWorkDay } from "../types/types.js";

export class WorkDayInfoResolver implements DayInfoResolver {
  isSpecialFullDay(day: DomainWorkDay): boolean {
    return day.meta.typeDay === WorkDayType.SpecialFull;
  }

  hasCrossDayContinuation(day: DomainWorkDay): boolean {
    return day.meta.crossDayContinuation === true;
  }
}
