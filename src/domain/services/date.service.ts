import {
  differenceInDays,
  startOfDay,
  isAfter,
  addDays,
  format,
} from "date-fns";

export class DateService {
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
    const offsetMinutes = new Date(date).getTimezoneOffset();
    const specialStart = -offsetMinutes / 60 === 3 ? 18 : 17;
    return specialStart * 60;
  }
}
