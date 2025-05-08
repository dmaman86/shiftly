import { WorkDayType } from "@/models";

export const HolidayUtils = (() => {
  const paidHolidays = [
    "Rosh Hashana",
    "Rosh Hashana II",
    "Yom Kippur",
    "Sukkot I",
    "Shmini Atzeret",
    "Pesach I",
    "Yom HaAtzma’ut",
    "Shavuot",
  ];
  const FRIDAY = 5;
  const SATURDAY = 6;

  const isPaidHoliday = (eventTitles: string[]): boolean => {
    return eventTitles.some(
      (e) => paidHolidays.includes(e) || e.startsWith("Rosh Hashana"),
    );
  };

  const isPartialStart = (eventTitles: string[]): boolean => {
    return (
      eventTitles.some((e) => e.startsWith("Erev")) ||
      eventTitles.includes("Yom HaZikaron") ||
      eventTitles.includes("Sukkot VII (Hoshana Rabba)")
    );
  };

  const resolveDayType = (
    weekday: number,
    eventTitles: string[],
  ): WorkDayType => {
    if (weekday === SATURDAY || isPaidHoliday(eventTitles))
      return WorkDayType.SpecialFull;
    if (isPartialStart(eventTitles) || weekday === FRIDAY)
      return WorkDayType.SpecialPartialStart;
    return WorkDayType.Regular;
  };

  return { isPaidHoliday, isPartialStart, resolveDayType };
})();
