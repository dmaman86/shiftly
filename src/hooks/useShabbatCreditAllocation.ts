import { useMemo } from "react";
import { useSelector } from "react-redux";

import { allocateShabbatCredit } from "@/domain";
import { RootState } from "@/redux/store";

export const useShabbatCreditAllocation = () => {
  const workDays = useSelector((state: RootState) => state.workDays.workDays);
  const dailyPayMaps = useSelector(
    (state: RootState) => state.global.dailyPayMaps,
  );
  const standardHours = useSelector(
    (state: RootState) => state.global.config.standardHours,
  );

  return useMemo(
    () =>
      allocateShabbatCredit({ workDays, dailyPayMaps, standardHours }),
    [workDays, dailyPayMaps, standardHours],
  );
};
