import { useQuery } from "@tanstack/react-query";

import { DomainContextType } from "@/app";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalState } from "@/hooks/useGlobalState";
import { shiftService, workDayService } from "@/services";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";

export type PersistedWorkTableRecords = {
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
};

type UsePersistedWorkTableRecordsProps = {
  domain: DomainContextType;
  enabled: boolean;
};

export const usePersistedWorkTableRecords = ({
  domain,
  enabled,
}: UsePersistedWorkTableRecordsProps) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { year, month } = useGlobalState();
  const userId = user?.id;

  return useQuery({
    queryKey: ["workTable", userId, year, month],
    enabled: enabled && !!userId && !isAuthLoading,
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
};
