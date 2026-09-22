import type { useTranslation } from "react-i18next";
import type { PayBreakdownViewModel } from "@/app/types";
import { MealAllowanceRates, Segment } from "@/domain";
import {
  mapSegmentsToPayRows,
  mapAllowanceRows,
  PayRowVM,
} from "@/features/salary-summary";

type TranslateFn = ReturnType<typeof useTranslation<"work-table">>["t"];

export const buildBasePayRows = (
  payVM: PayBreakdownViewModel,
  baseRate: number,
  t: TranslateFn,
): PayRowVM[] => {
  const baseMap: Record<string, { label: string; segment: Segment }> = {
    regular100: { label: t("pay_labels.regular_100"), segment: payVM.regular.hours100 },
    shabbatCredit100: {
      label: t("pay_labels.shabbat_bonus_100"),
      segment: payVM.appliedShabbatCredit,
    },
    sick100: { label: t("pay_labels.sick"), segment: payVM.hours100Sick },
    vacation100: { label: t("pay_labels.vacation"), segment: payVM.hours100Vacation },
  };

  return mapSegmentsToPayRows(baseRate, baseMap);
};

export const buildExtraPayRows = (
  payVM: PayBreakdownViewModel,
  baseRate: number,
  t: TranslateFn,
): PayRowVM[] => {
  const extraMap: Record<string, { label: string; segment: Segment }> = {
    night50: { label: t("pay_labels.night_50"), segment: payVM.extra.hours50 },
    shabbat150: { label: t("pay_labels.shabbat_150"), segment: payVM.regular.hours150 },
    extra125: { label: t("pay_labels.extra_125"), segment: payVM.regular.hours125 },
    shabbatRate150: {
      label: t("pay_labels.shabbat_rate_150"),
      segment: payVM.special.shabbat150,
    },
    shabbatRate200: {
      label: t("pay_labels.shabbat_rate_200"),
      segment: payVM.special.shabbat200,
    },
    evening20: { label: t("pay_labels.evening_20"), segment: payVM.extra.hours20 },
  };

  return mapSegmentsToPayRows(baseRate, extraMap);
};

export const buildAllowanceRows = (
  payVM: PayBreakdownViewModel,
  allowanceRate: MealAllowanceRates,
  rateDiem: number,
  t: TranslateFn,
): PayRowVM[] => {
  return mapAllowanceRows({
    perDiem: { points: payVM.perDiemPoints, rate: payVM.perDiemAmount },
    mealAllowance: {
      small: { points: payVM.smallPoints, amount: payVM.smallAmount },
      large: { points: payVM.largePoints, amount: payVM.largeAmount },
    },
    rates: allowanceRate,
    rateDiem,
    t,
  });
};
