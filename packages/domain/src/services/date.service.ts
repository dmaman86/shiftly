import {
  differenceInDays,
  startOfDay,
  isAfter,
  addDays,
  format,
  isValid,
  parseISO,
} from "date-fns";

export const WORK_TIME_ZONE = "Asia/Jerusalem";

const persistedDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WORK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const getDateTimeParts = (date: Date): DateTimeParts => {
  const parts = Object.fromEntries(
    persistedDateFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

const getLocalDateTimeParts = (date: Date): DateTimeParts => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
  hour: date.getHours(),
  minute: date.getMinutes(),
  second: date.getSeconds(),
});

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINUTES_PER_HOUR = 60;
const WINTER_START_HOUR = 17;
const SUMMER_START_HOUR = 18;
const SUMMER_START_MONTH = 4;
const SUMMER_END_MONTH = 9;

export class DateService {
  constructor() {}

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

  getWeekday(date: string): number {
    return this.createDateWithTime(date).getDay();
  }

  getDayOfMonth(date: string): string {
    return format(this.createDateWithTime(date), "dd");
  }

  createDateWithTime(
    day: string,
    hours: number = 0,
    minutes: number = 0,
  ): Date {
    const [year, month, dayOfMonth] = day.split("-").map(Number);
    return new Date(year, month - 1, dayOfMonth, hours, minutes, 0, 0);
  }

  /**
   * Rehydrates a persisted instant as a browser-local Date whose fields keep
   * the Israeli wall-clock time used by the payroll domain.
   */
  createDateFromPersisted(value: string): Date {
    const parts = getDateTimeParts(new Date(value));
    return new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
  }

  /**
   * Persists a browser-local wall-clock Date as an instant in the configured
   * work timezone. The database can remain `timestamptz` without making the
   * calculation depend on the browser timezone.
   */
  toPersistedDateTime(date: Date): string {
    const local = getLocalDateTimeParts(date);
    const desiredUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    let candidate = new Date(desiredUtc);

    // Resolve the timezone offset by converging on the instant that formats
    // to the requested wall-clock fields in Asia/Jerusalem.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const actual = getDateTimeParts(candidate);
      const actualUtc = Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
        actual.second,
      );
      candidate = new Date(candidate.getTime() + desiredUtc - actualUtc);
    }

    return candidate.toISOString();
  }

  getNextMonthDay(year: number, month: number): Date {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 1);
  }

  getPreviousMonth(
    year: number,
    month: number,
  ): { year: number; month: number } {
    return month === 1
      ? { year: year - 1, month: 12 }
      : { year, month: month - 1 };
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
    const match = date.match(DATE_ONLY_PATTERN);

    if (!match) {
      throw new RangeError(`Invalid date: "${date}"`);
    }

    const calendarDate = parseISO(date);
    if (!isValid(calendarDate)) {
      throw new RangeError(`Invalid date: "${date}"`);
    }

    const month = calendarDate.getMonth() + 1;
    const specialStartHour =
      month >= SUMMER_START_MONTH && month <= SUMMER_END_MONTH
        ? SUMMER_START_HOUR
        : WINTER_START_HOUR;

    return specialStartHour * MINUTES_PER_HOUR;
  }
}
