import type { useTranslation } from "react-i18next";
import { MealAllowanceRates, PayBreakdownViewModel, Segment } from "@/domain";
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
  const baseMap: Record<string, Segment> = {
    [t("pay_labels.regular_100")]: payVM.regular.hours100,
    [t("pay_labels.shabbat_bonus_100")]: payVM.extra100Shabbat,
    [t("pay_labels.sick")]: payVM.hours100Sick,
    [t("pay_labels.vacation")]: payVM.hours100Vacation,
  };

  return mapSegmentsToPayRows(baseRate, baseMap);
};

export const buildExtraPayRows = (
  payVM: PayBreakdownViewModel,
  baseRate: number,
  t: TranslateFn,
): PayRowVM[] => {
  const extraMap: Record<string, Segment> = {
    [t("pay_labels.night_50")]: payVM.extra.hours50,
    [t("pay_labels.shabbat_150")]: payVM.regular.hours150,
    [t("pay_labels.extra_125")]: payVM.regular.hours125,
    [t("pay_labels.shabbat_rate_150")]: payVM.special.shabbat150,
    [t("pay_labels.shabbat_rate_200")]: payVM.special.shabbat200,
    [t("pay_labels.evening_20")]: payVM.extra.hours20,
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
