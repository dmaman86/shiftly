import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { MonthPayMapReducer } from "@/domain";
import { createSelectGlobalBreakdown } from "@/redux/selectors/globalBreakdown.selector";

export const useGlobalBreakdown = (
  monthPayMapCalculator: MonthPayMapReducer,
) => {
  const selectGlobalBreakdown = useMemo(
    () => createSelectGlobalBreakdown(monthPayMapCalculator),
    [monthPayMapCalculator],
  );

  return useSelector(selectGlobalBreakdown);
};
