import { useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { DomainContextType } from "@/app";
import { WorkDayInfo } from "@/domain";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalState } from "@/hooks/useGlobalState";
import { shiftService, workDayService } from "@/services";
import { recordsToWorkTableDayState } from "../mappers/recordsToWorkTableDayState";
import { WorkTableDayStateContext } from "./workTableDayStateContext";

type UseHydrateWorkTableDayStateProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
};

/**
 * Fetches this month's persisted day statuses and shifts for the
 * authenticated user and replaces the provider's state with them. A no-op in
 * guest mode, leaving the provider's empty initial state untouched.
 */
export const useHydrateWorkTableDayState = ({
  domain,
  workDays,
}: UseHydrateWorkTableDayStateProps) => {
  const context = useContext(WorkTableDayStateContext);

  if (!context) {
    throw new Error(
      "useHydrateWorkTableDayState must be used within WorkTableDayStateProvider",
    );
  }

  const { dispatch, hydrated, setHydrated } = context;
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const { year, month, standardHours } = useGlobalState();
  const query = useQuery({
    queryKey: ["workTable", userId, year, month],
    enabled: !!userId && !isAuthLoading && workDays.length > 0 && !hydrated,
    // This is an initial snapshot for an editor, not a live replacement of drafts.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async () => {
      if (!userId) throw new Error("An authenticated user is required");
      const { startDate, endDate } = domain.services.dateService.getDatesRange(year, month);
      const [daysResult, shiftsResult] = await Promise.all([
        workDayService().fetchForMonth(userId, startDate, endDate).call(),
        shiftService().fetchForMonth(userId, startDate, endDate).call(),
      ]);
      if (daysResult.error) throw new Error(daysResult.error);
      if (shiftsResult.error) throw new Error(shiftsResult.error);
      return { days: daysResult.data ?? [], shifts: shiftsResult.data ?? [] };
    },
  });

  useEffect(() => {
    if (!userId || hydrated || !query.isSuccess || query.isFetching || !query.data) return;
    const state = recordsToWorkTableDayState({
      ...query.data,
      workDays,
      shiftMapBuilder: domain.payMap.shiftMapBuilder,
      standardHours,
    });
    dispatch({ type: "hydrate", state });
    setHydrated(true);
  }, [
    userId,
    hydrated,
    query.isSuccess,
    query.isFetching,
    query.data,
    workDays,
    domain,
    standardHours,
    dispatch,
    setHydrated,
  ]);

  return {
    ready: !isAuthLoading && (!userId || hydrated),
    error: query.error,
    retry: query.refetch,
    isFetching: query.isFetching,
  };
};
