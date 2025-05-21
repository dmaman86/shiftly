import { format } from "date-fns";

import { hebrewDays, monthNames, WorkDayType } from "@/constants";
import { WorkDayInfo, resolveHolidayType } from "@/domain";

export const DateUtils = (() => {
  const formatDate = (date: Date): string => format(date, "yyyy-MM-dd");

  const getHebrewDayLetter = (date: Date): string => hebrewDays[date.getDay()];

  const getNextMonthDay = (year: number, month: number): Date => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 1);
  };

  const getDaysInMonth = (year: number, month: number): number =>
    new Date(year, month, 0).getDate();

  const getMonth = (month: number): string => monthNames[month - 1];

  const getDatesRange = (
    year: number,
    month: number,
  ): { startDate: string; endDate: string } => {
    const start = new Date(year, month - 1, 1);
    const end = getNextMonthDay(year, month);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  };

  const generateWorkDays = (
    year: number,
    month: number,
    eventMap: Record<string, string[]>,
  ): WorkDayInfo[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const days: WorkDayInfo[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const formattedDate = formatDate(currentDate);
      const weekday = currentDate.getDay();
      const hebrewDay = getHebrewDayLetter(currentDate);
      const eventTitles = eventMap[formattedDate] || [];

      const currentType = resolveHolidayType(weekday, eventTitles);

      const row: WorkDayInfo = {
        meta: {
          date: formattedDate,
          typeDay: currentType,
          crossDayContinuation: false,
        },
        hebrewDay,
      };

      days[day - 1] = row;

      if (day > 1) {
        days[day - 2].meta.crossDayContinuation =
          currentType === WorkDayType.SpecialFull;
      }
    }
    return days;
  };

  const getSpecialStartMinutes = (date: string): number => {
    const offsetMinutes = new Date(date).getTimezoneOffset();
    const specialStart = -offsetMinutes / 60 === 3 ? 18 : 19;
    return specialStart * 60;
  };

  const dayOfMonth = (dateStr: string, hebrewDay: string): string => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString("he-IL", { day: "2-digit" });
    return `${hebrewDay}-${day}`;
  };

  const createDateWithTime = (
    day: string,
    hours: number = 0,
    minutes: number = 0,
  ): Date => {
    const [year, month, dayOfMonth] = day.split("-").map(Number);
    return new Date(year, month - 1, dayOfMonth, hours, minutes, 0, 0);
  };

  return {
    hebrewDays,
    monthNames,
    formatDate,
    getHebrewDayLetter,
    getNextMonthDay,
    getDaysInMonth,
    getMonth,
    getDatesRange,
    generateWorkDays,
    getSpecialStartMinutes,
    dayOfMonth,
    createDateWithTime,
  };
})();
