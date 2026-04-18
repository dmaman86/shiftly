import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("work-table");
  const monthNames = t("months", { returnObjects: true }) as string[];

  const [sections, setSections] = useState<SalarySectionConfig[]>([]);

  const getMonthLabel = useCallback(
    (year: number, month: number) => `${monthNames[month - 1]} ${year}`,
    [monthNames],
  );

  const updateSections = useCallback(
    (
      globalBreakdown: MonthPayMap,
      year: number,
      month: number,
      baseRate: number,
    ) => {
      const rateDiem = domain.resolvers.perDiemResolver.resolve({
        year,
        month,
      });
      const allowanceRate = domain.resolvers.mealAllowanceRateResolver.resolve({
        year,
        month,
      });

      const payVM = monthToPayBreakdownVM(globalBreakdown);

      setSections(() =>
        buildSectionsSalary({ payVM, baseRate, allowanceRate, rateDiem, t }),
      );
    },
    [domain, t],
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
