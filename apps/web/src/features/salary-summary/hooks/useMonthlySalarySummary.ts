import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DomainContextType } from "@/app";
import type { PayBreakdownViewModel } from "@/app/types";
import {
  buildSectionsSalary,
  applyQuantityOverrides,
  calculateTotal,
  SalaryQuantityOverrides,
} from "@/features/salary-summary";

type MonthlySalarySummaryParams = {
  domain: DomainContextType;
  monthFullBreakdown: PayBreakdownViewModel;
  year: number;
  month: number;
  baseRate: number;
  quantityOverrides: SalaryQuantityOverrides;
};

export const useMonthlySalarySummary = ({
  domain,
  monthFullBreakdown,
  year,
  month,
  baseRate,
  quantityOverrides,
}: MonthlySalarySummaryParams) => {
  const { t } = useTranslation("work-table");
  const monthNames = t("months", { returnObjects: true }) as string[];

  const getMonthLabel = useCallback(
    (y: number, m: number) => `${monthNames[m - 1]} ${y}`,
    [monthNames],
  );

  const sections = useMemo(() => {
    const rateDiem = domain.resolvers.perDiemResolver.calculateRate({
      year,
      month,
    });
    const allowanceRate = domain.resolvers.mealAllowanceRateResolver.calculateRates({
      year,
      month,
    });
    return buildSectionsSalary({
      payVM: monthFullBreakdown,
      baseRate,
      allowanceRate,
      rateDiem,
      t,
    });
  }, [
    domain,
    monthFullBreakdown,
    year,
    month,
    baseRate,
    t,
  ]);

  const monthlyTotal = useMemo(
    () =>
      sections.reduce((sum, section) => {
        const rows =
          section.type === "allowance"
            ? section.buildRows(
                section.payVM,
                section.allowanceRate,
                section.rateDiem,
              )
            : section.buildRows(section.payVM, section.baseRate);
        const rowsWithOverrides = applyQuantityOverrides(
          rows,
          section.id,
          quantityOverrides,
        );

        return sum + calculateTotal(rowsWithOverrides);
      }, 0),
    [quantityOverrides, sections],
  );

  return { sections, getMonthLabel, monthlyTotal };
};
