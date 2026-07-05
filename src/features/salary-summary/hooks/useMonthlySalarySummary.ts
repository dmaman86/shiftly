import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DomainContextType } from "@/app";
import { MonthPayMap } from "@/domain";

import { monthToPayBreakdownVM } from "@/adapters";
import {
  buildSectionsSalary,
  calculateTotal,
} from "@/features/salary-summary";

type MonthlySalarySummaryParams = {
  domain: DomainContextType;
  globalBreakdown: MonthPayMap;
  year: number;
  month: number;
  baseRate: number;
};

export const useMonthlySalarySummary = ({
  domain,
  globalBreakdown,
  year,
  month,
  baseRate,
}: MonthlySalarySummaryParams) => {
  const { t } = useTranslation("work-table");
  const monthNames = t("months", { returnObjects: true }) as string[];

  const getMonthLabel = useCallback(
    (y: number, m: number) => `${monthNames[m - 1]} ${y}`,
    [monthNames],
  );

  const sections = useMemo(() => {
    const rateDiem = domain.resolvers.perDiemResolver.resolve({ year, month });
    const allowanceRate = domain.resolvers.mealAllowanceRateResolver.resolve({
      year,
      month,
    });
    const payVM = monthToPayBreakdownVM(globalBreakdown);
    return buildSectionsSalary({ payVM, baseRate, allowanceRate, rateDiem, t });
  }, [domain, globalBreakdown, year, month, baseRate, t]);

  const monthlyTotal = useMemo(() => {
    return sections.reduce((sum, section) => {
      const rows =
        section.type === "allowance"
          ? section.buildRows(
              section.payVM,
              section.allowanceRate,
              section.rateDiem,
            )
          : section.buildRows(section.payVM, section.baseRate);
      return sum + calculateTotal(rows);
    }, 0);
  }, [sections]);

  return { sections, getMonthLabel, monthlyTotal };
};
