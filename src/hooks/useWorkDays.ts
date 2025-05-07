import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { WorkDayRowProps, WorkDayType } from "@/models";

const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

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

export const useWorkDays = (
  year: number,
  month: number,
  eventMap: Record<string, string[]>,
) => {
  const [workDays, setWorkDays] = useState<WorkDayRowProps[]>([]);
  const FRIDAY = 5;
  const SATURDAY = 6;

  const formatDate = useCallback(
    (date: Date): string => format(date, "yyyy-MM-dd"),
    [],
  );

  const getHebrewDayLetter = useCallback((date: Date): string => {
    return hebrewDays[date.getDay()];
  }, []);

  const isPaidHoliday = useCallback((eventTitles: string[]): boolean => {
    return eventTitles.some(
      (e) => paidHolidays.includes(e) || e.startsWith("Rosh Hashana"),
    );
  }, []);

  const isPartialStart = useCallback((eventTitles: string[]): boolean => {
    return (
      eventTitles.some((e) => e.startsWith("Erev")) ||
      eventTitles.includes("Yom HaZikaron") ||
      eventTitles.includes("Sukkot VII (Hoshana Rabba)")
    );
  }, []);

  const resolveDayType = useCallback(
    (weekday: number, eventTitles: string[]): WorkDayType => {
      if (weekday === SATURDAY || isPaidHoliday(eventTitles))
        return WorkDayType.SpecialFull;

      if (isPartialStart(eventTitles) || weekday === FRIDAY) {
        return WorkDayType.SpecialPartialStart;
      }

      return WorkDayType.Regular;
    },
    [isPaidHoliday, isPartialStart],
  );

  const generateWorkDays = useCallback(
    (daysInMonth: number, year: number, month: number) => {
      const days: WorkDayRowProps[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const formattedDate = formatDate(currentDate);
        const weekday = currentDate.getDay();
        const hebrewDay = getHebrewDayLetter(currentDate);
        const eventTitles = eventMap[formattedDate] || [];

        const currentType = resolveDayType(weekday, eventTitles);

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
    },
    [eventMap],
  );

  const getNextMonthDay = useCallback((year: number, month: number): Date => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthDay = new Date(nextYear, nextMonth - 1, 1);

    return nextMonthDay;
  }, []);

  useEffect(() => {
    if (Object.keys(eventMap).length === 0) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const days: WorkDayRowProps[] = generateWorkDays(daysInMonth, year, month);

    const nextMonthDay = getNextMonthDay(year, month);
    const nextDayEvents = eventMap[formatDate(nextMonthDay)] || [];
    const nextDayType = resolveDayType(nextMonthDay.getDay(), nextDayEvents);
    days[daysInMonth - 1].crossDayContinuation =
      nextDayType === WorkDayType.SpecialFull;

    setWorkDays(days);
  }, [eventMap, year, month]);

  return { workDays };
};
