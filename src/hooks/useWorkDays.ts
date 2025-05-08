import { useEffect, useState } from "react";
import { WorkDayRowProps, WorkDayType } from "@/models";
import { DateUtils, HolidayUtils } from "@/utility";

export const useWorkDays = (
  year: number,
  month: number,
  eventMap: Record<string, string[]>,
) => {
  const [workDays, setWorkDays] = useState<WorkDayRowProps[]>([]);
  const { formatDate, getNextMonthDay, generateWorkDays } = DateUtils;
  const { resolveDayType } = HolidayUtils;

  useEffect(() => {
    setWorkDays([]); // Reset work days when year or month changes
  }, [year, month]);

  useEffect(() => {
    if (!Object.keys(eventMap).length || workDays.length) return;

    const days: WorkDayRowProps[] = generateWorkDays(year, month, eventMap);

    const nextMonthDay = getNextMonthDay(year, month);
    const nextDayEvents = eventMap[formatDate(nextMonthDay)] || [];
    const nextDayType = resolveDayType(nextMonthDay.getDay(), nextDayEvents);
    days[days.length - 1].crossDayContinuation =
      nextDayType === WorkDayType.SpecialFull;

    setWorkDays(days);
  }, [eventMap, year, month]);

  return { workDays };
};
