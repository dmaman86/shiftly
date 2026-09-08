import { useQuery } from "@tanstack/react-query";

import { WorkDayType } from "@/constants";
import { buildEventMap } from "@/adapters";
import { DomainContextType } from "@/app";
import { hebcalService, analyticsService } from "@/services";
import { useGlobalState } from "./useGlobalState";

const calendarApi = hebcalService();

export const useWorkDays = (domain: DomainContextType) => {
  const { year, month } = useGlobalState();
  const { dateService } = domain.services;

  const query = useQuery({
    queryKey: ["workDays", year, month],
    queryFn: async () => {
      const { startDate, endDate } = dateService.getDatesRange(year, month);
      const result = await calendarApi.getData(startDate, endDate).call();

      if (result.error) {
        analyticsService.track({
          name: "exception",
          params: {
            description: result.error,
            fatal: false,
            error_type: "hebcal_api_error",
          },
        });
        throw new Error(result.error);
      }

      const eventMap = buildEventMap(result.data);
      return domain.payMap.workDaysMonthBuilder.build({ year, month, eventMap });
    },
  });

  const workDays = query.data ?? [];

  const getDayInfo = (date: string) =>
    workDays.find((d) => d.meta.date === date);

  const isSpecialFullDay = (date: string) => {
    const day = getDayInfo(date);
    return day ? day.meta.typeDay === WorkDayType.SpecialFull : false;
  };

  const isPartialHolidayDay = (date: string) => {
    const day = getDayInfo(date);
    return day ? day.meta.typeDay === WorkDayType.SpecialPartialStart : false;
  };

  const isCrossDaySpecial = (date: string) => {
    const day = getDayInfo(date);
    return day ? day.meta.crossDayContinuation === true : false;
  };

  return {
    workDays,
    isLoading: query.isLoading,
    error: query.error,
    getDayInfo,
    isSpecialFullDay,
    isPartialHolidayDay,
    isCrossDaySpecial,
  };
};
