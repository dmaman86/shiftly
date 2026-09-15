import { useContext, useEffect } from "react";
import { DomainContextType } from "@/app";
import { WorkDayInfo } from "@/domain";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalState } from "@/hooks/useGlobalState";
import { recordsToWorkTableDayState } from "../mappers/recordsToWorkTableDayState";
import { WorkTableDayStateContext } from "../context/workTableDayState/workTableDayStateContext";
import { usePersistedWorkTableRecords } from "./usePersistedWorkTableRecords";

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
  const { standardHours } = useGlobalState();
  const query = usePersistedWorkTableRecords({
    domain,
    enabled: workDays.length > 0 && !hydrated,
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
