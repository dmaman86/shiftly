import { Weekend, WorkDayType } from "@/constants";
import { HolidayResolver } from "@/domain";

export class HolidayResolverService implements HolidayResolver {
  private readonly paidHolidays = [
    "Rosh Hashana",
    "Rosh Hashana II",
    "Yom Kippur",
    "Sukkot I",
    "Shmini Atzeret",
    "Pesach I",
    "Yom HaAtzma’ut",
    "Shavuot I",
  ];

  private isPaidHoliday(eventTitles: string[]): boolean {
    return eventTitles.some(
      (e) => this.paidHolidays.includes(e) || e.startsWith("Rosh Hashana"),
    );
  }

  private isPartialStart(eventTitles: string[]): boolean {
    return (
      eventTitles.some((e) => e.startsWith("Erev")) ||
      eventTitles.includes("Yom HaZikaron") ||
      eventTitles.includes("Sukkot VII (Hoshana Rabba)")
    );
  }

  resolve(params: { weekday: number; eventTitles: string[] }): WorkDayType {
    const { weekday, eventTitles } = params;

    if (weekday === Weekend.SATURDAY || this.isPaidHoliday(eventTitles))
      return WorkDayType.SpecialFull;

    if (this.isPartialStart(eventTitles) || weekday === Weekend.FRIDAY)
      return WorkDayType.SpecialPartialStart;

    return WorkDayType.Regular;
  }
}
