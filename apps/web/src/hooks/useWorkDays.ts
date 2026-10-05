import { useQuery } from "@tanstack/react-query";

import type { CalendarEventMap } from "@shiftly/domain";
import { WorkDayType } from "@shiftly/domain";
import { buildEventMap } from "@/adapters";
import { DomainContextType } from "@/app";
import { calendarService, hebcalService, analyticsService } from "@/services";
import { resolveErrorMessage } from "@/utils";
import { useGlobalState } from "./useGlobalState";

const staticCalendarApi = calendarService();
const hebcalApi = hebcalService();

const trackCalendarError = (description: string, errorType: string) =>
  analyticsService.track({
    name: "exception",
    params: { description, fatal: false, error_type: errorType },
  });

const loadStaticEventMap = async (
  startDate: string,
  endDate: string,
): Promise<CalendarEventMap | undefined> => {
  // A month range can cross into the next year (December includes Jan 1).
  const years = [
    ...new Set([startDate, endDate].map((date) => Number(date.slice(0, 4)))),
  ];
  const results = await Promise.all(
    years.map((year) => staticCalendarApi.getYear(year)),
  );

  const requestError = results.find((result) => result.error)?.error;
  if (requestError) {
    trackCalendarError(requestError, "static_calendar_error");
    return undefined;
  }

  // Hosts with an SPA fallback (e.g. the Vite dev server) answer a missing
  // year with 200 + index.html, so an unparseable payload is also a miss.
  try {
    return Object.assign(
      {},
      ...results.map((result) => buildEventMap(result.data)),
    );
  } catch (err) {
    trackCalendarError(resolveErrorMessage(err), "static_calendar_invalid");
    return undefined;
  }
};

/**
 * Prefers the static calendar files; Hebcal is only a fallback for years
 * outside the generated range or when a static file cannot be used.
 */
export const loadCalendarEventMap = async (
  startDate: string,
  endDate: string,
): Promise<CalendarEventMap> => {
  const staticEventMap = await loadStaticEventMap(startDate, endDate);
  if (staticEventMap) return staticEventMap;

  const result = await hebcalApi.getData(startDate, endDate).call();

  if (result.error) {
    trackCalendarError(result.error, "hebcal_api_error");
    throw new Error(result.error);
  }

  return buildEventMap(result.data);
};

export const useWorkDays = (domain: DomainContextType) => {
  const { year, month } = useGlobalState();
  const { dateService } = domain.services;

  const query = useQuery({
    queryKey: ["workDays", year, month],
    queryFn: async () => {
      const { startDate, endDate } = dateService.getDatesRange(year, month);
      const eventMap = await loadCalendarEventMap(startDate, endDate);
      return domain.payMap.workDaysMonthBuilder.build({
        year,
        month,
        eventMap,
      });
    },
    // The holiday calendar for a given month never changes.
    staleTime: Infinity,
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
