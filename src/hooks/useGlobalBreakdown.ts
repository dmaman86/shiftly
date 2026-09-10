import { useMemo } from "react";
import type { MonthPayMapReducer } from "@/domain";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";
import { useGlobalStore } from "@/store/globalStore";

export const useGlobalBreakdown = (
  monthPayMapCalculator: MonthPayMapReducer,
) => {
  const dailyPayMaps = useGlobalStore((state) => state.dailyPayMaps);

  return useMemo(
    () => calculateGlobalBreakdown(dailyPayMaps, monthPayMapCalculator),
    [dailyPayMaps, monthPayMapCalculator],
  );
};
