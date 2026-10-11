import { useEffect, useMemo } from "react";

import { allocateShabbatCredit } from "@shiftly/domain";
import { useAuth, useDomain, useGlobalState, useWorkDays } from "@/hooks";
import { useGlobalStore } from "@/store/globalStore";
import { monthCalculationKey } from "@/store/monthCalculationKey";
import { useShabbatCreditCarryOver } from "./useShabbatCreditCarryOver";

export const useShabbatCreditAllocation = () => {
  const { user } = useAuth();
  const domain = useDomain();
  const { standardHours, year, month } = useGlobalState();
  const { workDays } = useWorkDays(domain);
  const dailyPayMaps = useGlobalStore((state) => state.dailyPayMaps);
  const projectionKey = useGlobalStore((state) => state.dailyPayMapsContextKey);
  const {
    carriedOverHours,
    ready: carryOverReady,
    persistUnusedHours,
    error,
    retry,
  } = useShabbatCreditCarryOver();
  const ready =
    carryOverReady &&
    projectionKey === monthCalculationKey(user?.id, year, month, standardHours);

  const allocation = useMemo(
    () =>
      allocateShabbatCredit({
        workDays,
        dailyPayMaps,
        standardHours,
        carriedOverHours: user ? carriedOverHours : 0,
      }),
    [workDays, dailyPayMaps, standardHours, carriedOverHours, user],
  );

  useEffect(() => {
    if (!user || !ready) return;
    persistUnusedHours(allocation.unusedHours);
  }, [allocation.unusedHours, persistUnusedHours, user, ready]);

  return {
    ...allocation,
    ready,
    error,
    retry: () => {
      // A failed load can retry before hydration; a failed write needs current data.
      if (!carryOverReady || ready)
        retry(ready ? allocation.unusedHours : undefined);
    },
  };
};
