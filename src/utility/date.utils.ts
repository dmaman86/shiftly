import { WorkDayRowProps, WorkDayType } from "@/models";
import { format } from "date-fns";
import { HolidayUtils } from "./holiday.utils";

export const DateUtils = (() => {
  const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  const monthNames = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];

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
  ): WorkDayRowProps[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const days: WorkDayRowProps[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const formattedDate = formatDate(currentDate);
      const weekday = currentDate.getDay();
      const hebrewDay = getHebrewDayLetter(currentDate);
      const eventTitles = eventMap[formattedDate] || [];

      const currentType = HolidayUtils.resolveDayType(weekday, eventTitles);

      const row: WorkDayRowProps = {
        date: formattedDate,
        hebrewDay,
        typeDay: currentType,
        crossDayContinuation: false,
      };

      days[day - 1] = row;

      if (day > 1) {
        days[day - 2].crossDayContinuation =
          currentType === WorkDayType.SpecialFull;
      }
    }
    return days;
  };

  return {
    formatDate,
    getHebrewDayLetter,
    getNextMonthDay,
    getDatesRange,
    monthNames,
    getDaysInMonth,
    getMonth,
    generateWorkDays,
  };
})();
