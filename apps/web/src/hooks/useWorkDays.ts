import { useQuery } from "@tanstack/react-query";

import type { CalendarEventMap } from "@shiftly/domain";
import { WorkDayType } from "@shiftly/domain";
import { replaceElectionDays } from "@/adapters";
import { buildHolidayEventMap } from "@/adapters/holiday.adapter";
import type { DomainContextType } from "@/app";
import type { WorkDayInfo } from "@/app/types";
import { analyticsService } from "@/services";
import { israeliHolidaysBetween } from "@/services/calendar/israeliHolidays";
import {
  loadElectionDays,
  type YearElectionDays,
} from "@/services/reference/electionDays";
import { useGlobalState } from "./useGlobalState";

/**
 * How trustworthy the election days in a calendar are. "stale" uses the last
 * answer the API gave (fetchedAt is the oldest one involved); "missing" means
 * election days are unknown and the election premium may be absent.
 */
export type ElectionDataState =
  | { status: "fresh" }
  | { status: "stale"; fetchedAt: string }
  | { status: "missing" };

export interface CalendarData {
  eventMap: CalendarEventMap;
  electionData: ElectionDataState;
}

export interface MonthCalendar {
  workDays: WorkDayInfo[];
  electionData: ElectionDataState;
}

// A month range can cross into the next year (December includes Jan 1).
const yearsOf = (startDate: string, endDate: string): number[] => [
  ...new Set([startDate, endDate].map((date) => Number(date.slice(0, 4)))),
];

const trackElectionDays = ({ status, year, ...rest }: YearElectionDays) => {
  if (
    status === "fresh" ||
    ("reason" in rest && rest.reason === "not_configured")
  ) {
    return;
  }
  analyticsService.track({
    name: "exception",
    params: {
      description: `${year}: ${"reason" in rest ? rest.reason : status}`,
      fatal: false,
      error_type: `elections_${status}`,
    },
  });
};

const toElectionDataState = (days: YearElectionDays): ElectionDataState =>
  days.status === "stale"
    ? { status: "stale", fetchedAt: days.fetchedAt }
    : { status: days.status };

/** The least trustworthy state wins; stale keeps the oldest fetch time. */
export const combineElectionData = (
  states: readonly ElectionDataState[],
): ElectionDataState => {
  if (states.some(({ status }) => status === "missing")) {
    return { status: "missing" };
  }
  const staleAt = states
    .flatMap((state) => (state.status === "stale" ? [state.fetchedAt] : []))
    .sort();
  return staleAt.length > 0
    ? { status: "stale", fetchedAt: staleAt[0] }
    : { status: "fresh" };
};

/**
 * The calendar for whole years: holidays computed with jewish-date (no
 * request, no year limit) plus whatever election days are known. Missing
 * election days are left out; the caller reports them.
 */
export const buildCalendarEventMap = (
  years: readonly number[],
  electionDays: readonly YearElectionDays[],
): CalendarEventMap =>
  electionDays.reduce(
    (map, days) =>
      days.status === "missing"
        ? map
        : replaceElectionDays(map, days.year, days.elections),
    buildHolidayEventMap(
      israeliHolidaysBetween(
        `${years[0]}-01-01`,
        `${years[years.length - 1]}-12-31`,
      ),
    ),
  );

/**
 * Election days come from the API, or from its last known answer; when
 * neither exists they are reported missing, never treated as "no elections".
 */
export const loadCalendarEventMap = async (
  startDate: string,
  endDate: string,
): Promise<CalendarData> => {
  const years = yearsOf(startDate, endDate);
  const electionDays = await Promise.all(
    years.map((year) => loadElectionDays(year)),
  );
  electionDays.forEach(trackElectionDays);
  return {
    eventMap: buildCalendarEventMap(years, electionDays),
    electionData: combineElectionData(electionDays.map(toElectionDataState)),
  };
};

/** Shared by every reader of the ["workDays", year, month] query. */
export const monthCalendarQueryKey = (year: number, month: number) =>
  ["workDays", year, month] as const;

export const loadMonthCalendar = async (
  domain: DomainContextType,
  year: number,
  month: number,
): Promise<MonthCalendar> => {
  const { startDate, endDate } = domain.services.dateService.getDatesRange(
    year,
    month,
  );
  const { eventMap, electionData } = await loadCalendarEventMap(
    startDate,
    endDate,
  );
  return {
    workDays: domain.payMap.workDaysMonthBuilder.build({
      year,
      month,
      eventMap,
    }),
    electionData,
  };
};

export const useWorkDays = (domain: DomainContextType) => {
  const { year, month } = useGlobalState();
  const query = useQuery({
    queryKey: monthCalendarQueryKey(year, month),
    queryFn: () => loadMonthCalendar(domain, year, month),
    // Holidays never change; settled election days are kept for the session.
    // Stale or missing election days are retried on the next use.
    staleTime: (current) =>
      current.state.data?.electionData.status === "fresh" ? Infinity : 0,
  });

  const workDays = query.data?.workDays ?? [];
  const electionData = query.data?.electionData;

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
    electionData,
    /** Asks the API again; holidays need no retry. */
    retryElectionData: () => void query.refetch(),
    isRetryingElectionData: query.isRefetching,
    isLoading: query.isLoading,
    error: query.error,
    getDayInfo,
    isSpecialFullDay,
    isPartialHolidayDay,
    isCrossDaySpecial,
  };
};
