import { useQuery } from "@tanstack/react-query";

import type { CalendarEventMap } from "@shiftly/domain";
import { WorkDayType } from "@shiftly/domain";
import { buildEventMap, replaceElectionDays } from "@/adapters";
import { DomainContextType } from "@/app";
import {
  calendarService,
  hebcalService,
  analyticsService,
  referenceService,
} from "@/services";
import { resolveErrorMessage } from "@/utils";
import { useGlobalState } from "./useGlobalState";

const staticCalendarApi = calendarService();
const hebcalApi = hebcalService();
const referenceApi = referenceService();

const trackCalendarError = (description: string, errorType: string) =>
  analyticsService.track({
    name: "exception",
    params: { description, fatal: false, error_type: errorType },
  });

// A month range can cross into the next year (December includes Jan 1).
const yearsOf = (startDate: string, endDate: string): number[] => [
  ...new Set([startDate, endDate].map((date) => Number(date.slice(0, 4)))),
];

const loadStaticEventMap = async (
  startDate: string,
  endDate: string,
): Promise<CalendarEventMap | undefined> => {
  const years = yearsOf(startDate, endDate);
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

const loadLegacyEventMap = async (
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

/**
 * Holidays come from the static calendar files, with Hebcal as a fallback for
 * years outside the generated range or when a static file cannot be used.
 * Election days come from the API when it answers; when it cannot be used,
 * the legacy election days stay in place.
 */
export const loadCalendarEventMap = async (
  startDate: string,
  endDate: string,
): Promise<CalendarEventMap> => {
  const years = yearsOf(startDate, endDate);
  const [legacyEventMap, electionResults] = await Promise.all([
    loadLegacyEventMap(startDate, endDate),
    Promise.all(years.map((year) => referenceApi.getElections(year))),
  ]);

  return years.reduce((eventMap, year, index) => {
    const result = electionResults[index];
    if (result.source === "api") {
      return replaceElectionDays(eventMap, year, result.elections);
    }
    if (result.reason !== "not_configured") {
      trackCalendarError(result.reason, "elections_api_unavailable");
    }
    return eventMap;
  }, legacyEventMap);
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
