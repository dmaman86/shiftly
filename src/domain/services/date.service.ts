import {
  differenceInDays,
  startOfDay,
  isAfter,
  addDays,
  format,
} from "date-fns";

export class DateService {
  private readonly timeZoneOffsetFormatter: Intl.DateTimeFormat;

  constructor(private readonly timeZone: string) {
    this.timeZoneOffsetFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
  }

  getMinutesFromMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  getDaysDifference(date1: Date, date2: Date): number {
    return differenceInDays(startOfDay(date1), startOfDay(date2));
  }

  isAfterDate(date1: Date, date2: Date): boolean {
    return isAfter(date1, date2);
  }

  addDaysToDate(date: Date, days: number): Date {
    return addDays(date, days);
  }

  minutesToTimeStr(minutes: number): string {
    const actualMinutes = minutes % 1440;
    const hours = Math.floor(actualMinutes / 60);
    const mins = actualMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  formatDate(date: Date): string {
    return format(date, "yyyy-MM-dd");
  }

  createDateWithTime(
    day: string,
    hours: number = 0,
    minutes: number = 0,
  ): Date {
    const [year, month, dayOfMonth] = day.split("-").map(Number);
    return new Date(year, month - 1, dayOfMonth, hours, minutes, 0, 0);
  }

  getNextMonthDay(year: number, month: number): Date {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 1);
  }

  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  getDatesRange(
    year: number,
    month: number,
  ): { startDate: string; endDate: string } {
    const start = new Date(year, month - 1, 1);
    const end = this.getNextMonthDay(year, month);
    return {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end),
    };
  }

  getSpecialStartMinutes(date: string): number {
    const offsetMinutes = this.getTimeZoneOffsetMinutes(date);

    if (offsetMinutes !== 120 && offsetMinutes !== 180) {
      throw new RangeError(
        `Unsupported UTC offset ${offsetMinutes} minutes for time zone "${this.timeZone}"`,
      );
    }

    const specialStart = offsetMinutes === 180 ? 18 : 17;
    return specialStart * 60;
  }

  private getTimeZoneOffsetMinutes(date: string): number {
    const instant = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00.000Z` : date,
    );

    if (Number.isNaN(instant.getTime())) {
      throw new RangeError(`Invalid date: "${date}"`);
    }

    const offset = this.timeZoneOffsetFormatter
      .formatToParts(instant)
      .find((part) => part.type === "timeZoneName")?.value;
    const match = offset?.match(/^GMT([+-])(\d{2}):(\d{2})$/);

    if (!match) {
      throw new RangeError(
        `Could not resolve UTC offset for time zone "${this.timeZone}"`,
      );
    }

    const [, sign, hours, minutes] = match;
    const absoluteMinutes = Number(hours) * 60 + Number(minutes);
    return sign === "+" ? absoluteMinutes : -absoluteMinutes;
  }
}
