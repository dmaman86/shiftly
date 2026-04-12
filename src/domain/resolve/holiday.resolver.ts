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
    "Pesach VII",
    "Yom HaAtzma'ut",
    "Shavuot I",
  ];

  private isPaidHoliday(eventTitles: string[]): boolean {
    return eventTitles.some(
      (e) => this.paidHolidays.includes(e) || e.startsWith("Rosh Hashana"),
    );
  }

  private readonly partialStartEvents = [
    "Erev Rosh Hashana",
    "Erev Yom Kippur",
    "Erev Sukkot",
    "Erev Pesach",
    "Erev Shavuot",
    "Yom HaZikaron",
    "Sukkot VII (Hoshana Rabba)",
    "Pesach VI (CH'M)",
  ];

  private isPartialStart(eventTitles: string[]): boolean {
    return eventTitles.some((e) => this.partialStartEvents.includes(e));
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
