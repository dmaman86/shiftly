import { useMemo } from "react";
import type { MonthPayMapReducer, PayBreakdownViewModel } from "@/domain";
import { monthToPayBreakdownVM } from "@/adapters";
import { useGlobalBreakdown } from "@/hooks";
import { monthToCompactPayBreakdownVM } from "../../mappers/month/monthToCompactPayBreakdownVM";
import type { CompactPayBreakdownVM } from "@/domain";

type UseMonthlyBreakdownsParams = {
  monthPayMapCalculator: MonthPayMapReducer;
  baseRate: number;
  shabbatCreditHours: number;
};

type MonthlyBreakdowns = {
  monthBreakdown: CompactPayBreakdownVM;
  monthFullBreakdown: PayBreakdownViewModel;
};

export const useMonthlyBreakdowns = ({
  monthPayMapCalculator,
  baseRate,
  shabbatCreditHours,
}: UseMonthlyBreakdownsParams): MonthlyBreakdowns => {
  const globalBreakdown = useGlobalBreakdown(monthPayMapCalculator);

  const monthFullBreakdown = useMemo(
    () => monthToPayBreakdownVM(globalBreakdown, shabbatCreditHours),
    [globalBreakdown, shabbatCreditHours],
  );

  const monthBreakdown = useMemo(
    () => monthToCompactPayBreakdownVM(monthFullBreakdown, baseRate),
    [monthFullBreakdown, baseRate],
  );

  return { monthBreakdown, monthFullBreakdown };
};
