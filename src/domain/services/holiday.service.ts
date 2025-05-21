import { Weekend, PAID_HOLIDAYS, WorkDayType } from "@/constants";

export const resolveHolidayType = (() => {
  const isPaidHoliday = (eventTitles: string[]): boolean => {
    return eventTitles.some(
      (e) => PAID_HOLIDAYS.includes(e) || e.startsWith("Rosh Hashana"),
    );
  };

  const isPartialStart = (eventTitles: string[]): boolean => {
    return (
      eventTitles.some((e) => e.startsWith("Erev")) ||
      eventTitles.includes("Yom HaZikaron") ||
      eventTitles.includes("Sukkot VII (Hoshana Rabba)")
    );
  };

  return (weekday: number, eventTitles: string[]): WorkDayType => {
    if (weekday === Weekend.SATURDAY || isPaidHoliday(eventTitles))
      return WorkDayType.SpecialFull;
    if (isPartialStart(eventTitles) || weekday === Weekend.FRIDAY)
      return WorkDayType.SpecialPartialStart;
    return WorkDayType.Regular;
  };
})();
