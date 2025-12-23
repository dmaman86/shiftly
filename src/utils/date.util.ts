import { format } from "date-fns";

export const DateUtils = () => {
  const formatDate = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
  };

  const getNextMonthDay = (year: number, month: number): Date => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 1);
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

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
    const specialStart = -offsetMinutes / 60 === 3 ? 18 : 17;
    return specialStart * 60;
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
    formatDate,
    getNextMonthDay,
    getDaysInMonth,
    getDatesRange,
    getSpecialStartMinutes,
    createDateWithTime,
  };
};
