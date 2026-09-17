import { useEffect, useMemo } from "react";

import { allocateShabbatCredit } from "@/domain";
import { useAuth, useDomain, useGlobalState, useWorkDays } from "@/hooks";
import { useGlobalStore } from "@/store/globalStore";
import { useShabbatCreditCarryOver } from "./useShabbatCreditCarryOver";

export const useShabbatCreditAllocation = () => {
  const { user } = useAuth();
  const domain = useDomain();
  const { standardHours } = useGlobalState();
  const { workDays } = useWorkDays(domain);
  const dailyPayMaps = useGlobalStore((state) => state.dailyPayMaps);
  const { carriedOverHours, persistUnusedHours } = useShabbatCreditCarryOver();

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
    if (!user) return;
    persistUnusedHours(allocation.unusedHours);
  }, [allocation.unusedHours, persistUnusedHours, user]);

  return allocation;
};
