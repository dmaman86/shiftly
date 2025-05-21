import { useEffect, useState } from "react";
import { WorkDayInfo, resolveHolidayType } from "@/domain";
import { WorkDayType } from "@/constants";
import { DateUtils } from "@/utils";

export const useWorkDays = (
  year: number,
  month: number,
  eventMap: Record<string, string[]>,
) => {
  const [workDays, setWorkDays] = useState<WorkDayInfo[]>([]);

  useEffect(() => {
    setWorkDays([]); // Reset work days when year or month changes
  }, [year, month]);

  useEffect(() => {
    if (!Object.keys(eventMap).length || workDays.length) return;

    const days: WorkDayInfo[] = DateUtils.generateWorkDays(
      year,
      month,
      eventMap,
    );

    const nextMonthDay = DateUtils.getNextMonthDay(year, month);
    const nextDayEvents = eventMap[DateUtils.formatDate(nextMonthDay)] || [];
    const nextDayType = resolveHolidayType(
      nextMonthDay.getDay(),
      nextDayEvents,
    );
    days[days.length - 1].meta.crossDayContinuation =
      nextDayType === WorkDayType.SpecialFull;

    setWorkDays(days);
  }, [eventMap, year, month, workDays]);

  return { workDays };
};
