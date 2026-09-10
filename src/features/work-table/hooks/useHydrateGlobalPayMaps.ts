import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import type { DomainContextType } from "@/app";
import type { WorkDayInfo } from "@/domain";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalState } from "@/hooks/useGlobalState";
import { useGlobalStore } from "@/store/globalStore";
import { shiftService, workDayService } from "@/services";
import { recordsToWorkTableDayState } from "../mappers/recordsToWorkTableDayState";
import { workTableStateToDailyPayMaps } from "../mappers/workTableStateToDailyPayMaps";

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

  const query = useQuery({
    queryKey: ["workTable", userId, year, month],
    enabled: !!userId && !isAuthLoading && workDays.length > 0,
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
