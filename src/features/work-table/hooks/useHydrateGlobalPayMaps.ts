import { useEffect } from "react";
import type { DomainContextType } from "@/app";
import type { WorkDayInfo } from "@/domain";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalState } from "@/hooks/useGlobalState";
import { useGlobalStore } from "@/store/globalStore";
import { recordsToWorkTableDayState } from "../mappers/recordsToWorkTableDayState";
import { workTableStateToDailyPayMaps } from "../mappers/workTableStateToDailyPayMaps";
import { usePersistedWorkTableRecords } from "./usePersistedWorkTableRecords";

type UseHydrateGlobalPayMapsProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
};

export const useHydrateGlobalPayMaps = ({
  domain,
  workDays,
}: UseHydrateGlobalPayMapsProps) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { year, month, standardHours } = useGlobalState();
  const replaceDailyPayMaps = useGlobalStore((state) => state.replaceDailyPayMaps);
  const userId = user?.id;
  const query = usePersistedWorkTableRecords({ domain, enabled: workDays.length > 0 });

  useEffect(() => {
    if (!query.isSuccess || query.isFetching || !query.data) return;

    const state = recordsToWorkTableDayState({
      ...query.data,
      workDays,
      shiftMapBuilder: domain.payMap.shiftMapBuilder,
      standardHours,
    });
    replaceDailyPayMaps(
      workTableStateToDailyPayMaps({
        domain,
        state,
        workDays,
        standardHours,
        year,
        month,
      }),
    );
  }, [
    domain,
    month,
    query.data,
    query.isFetching,
    query.isSuccess,
    replaceDailyPayMaps,
    standardHours,
    workDays,
    year,
  ]);

  return {
    ready: !isAuthLoading && (!userId || query.isSuccess),
    error: query.error,
    isFetching: query.isFetching,
  };
};
