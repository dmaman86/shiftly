import { useMemo } from "react";
import type { MonthPayMapReducer } from "@/domain";
import type {
  CompactPayBreakdownVM,
  PayBreakdownViewModel,
} from "@/app/types";
import { monthToPayBreakdownVM } from "@/adapters";
import { useGlobalBreakdown } from "@/hooks";
import { monthToCompactPayBreakdownVM } from "../../mappers/month/monthToCompactPayBreakdownVM";

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
