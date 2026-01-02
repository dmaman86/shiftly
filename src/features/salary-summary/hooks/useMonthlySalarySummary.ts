import { useCallback, useMemo, useState } from "react";
import { DomainContextType } from "@/app";
import { MonthPayMap } from "@/domain";

import { monthToPayBreakdownVM } from "@/adapters";
import {
  buildSectionsSalary,
  SalarySectionConfig,
} from "@/features/salary-summary";

type MonthlySalarySummaryParams = {
  domain: DomainContextType;
};

export const useMonthlySalarySummary = ({
  domain,
}: MonthlySalarySummaryParams) => {
  const monthResolver = domain.resolvers.monthResolver;

  const [sections, setSections] = useState<SalarySectionConfig[]>([]);

  const getMonthLabel = useCallback(
    (year: number, month: number) => {
      return `${monthResolver.getMonthName(month - 1)} ${year}`;
    },
    [monthResolver],
  );

  const updateSections = useCallback(
    (
      globalBreakdown: MonthPayMap,
      year: number,
      month: number,
      baseRate: number,
    ) => {
      // Resolve rates for the selected month/year
      const rateDiem = domain.resolvers.perDiemResolver.resolve({
        year,
        month,
      });
      const allowanceRate = domain.resolvers.mealAllowanceRateResolver.resolve({
        year,
        month,
      });

      // Convert domain to ViewModel
      const payVM = monthToPayBreakdownVM(globalBreakdown);

      setSections(() => {
        return buildSectionsSalary({
          payVM,
          baseRate,
          allowanceRate,
          rateDiem,
        });
      });
    },
    [domain],
  );

  const [totals, setTotals] = useState<Record<string, number>>({});

  const handleTotalChange = useCallback((id: string, total: number) => {
    setTotals((prev) => ({ ...prev, [id]: total }));
  }, []);

  const monthlyTotal = useMemo(
    () => Object.values(totals).reduce((sum, val) => sum + val, 0),
    [totals],
  );

  return {
    sections,
    updateSections,
    getMonthLabel,
    handleTotalChange,
    monthlyTotal,
  };
};
