import { format } from "date-fns";

import { hebrewDays, monthNames } from "@/constants";

export const DateUtils = () => {
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
    getSpecialStartMinutes,
    dayOfMonth,
    createDateWithTime,
  };
};
