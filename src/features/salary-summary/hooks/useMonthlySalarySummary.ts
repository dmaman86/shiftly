import { useMemo } from "react";

import { monthToPayBreakdownVM } from "@/adapters";
import { DomainContextType } from "@/app";
import { useGlobalState } from "@/hooks";

import { useSalaryPaySections } from "./useSalaryPaySections";

export const useMonthlySalarySummary = (domain: DomainContextType) => {
  const { globalBreakdown, baseRate, year, month } = useGlobalState();

  const monthResolver = domain.resolvers.monthResolver;
  const rateDiem = domain.resolvers.perDiemResolver.resolve({ year, month });
  const allowanceRate = domain.resolvers.mealAllowanceRateResolver.resolve({
    year,
    month,
  });

  const payVM = useMemo(() => {
    return monthToPayBreakdownVM(globalBreakdown);
  }, [globalBreakdown]);

  const { base, extra, allowance } = useSalaryPaySections({
    payVM,
    baseRate,
    allowanceRate,
    rateDiem,
  });

  const monthlySalary = useMemo(() => {
    return base.total + extra.total + allowance.total;
  }, [base.total, extra.total, allowance.total]);

  return {
    baseRows: base.rows,
    extraRows: extra.rows,
    allowanceRows: allowance.rows,

    updateBaseRow: base.updateRowQuantity,
    updateExtraRow: extra.updateRowQuantity,
    updateAllowanceRow: allowance.updateRowQuantity,

    monthlySalary,
    monthLabel: `${monthResolver.getMonthName(month - 1)} ${year}`,
  };
};
