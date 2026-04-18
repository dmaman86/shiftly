import type { useTranslation } from "react-i18next";
import {
  MealAllowance,
  MealAllowanceEntry,
  MealAllowanceRates,
} from "@/domain";
import { PayRowVM } from "@/features/salary-summary";

type TranslateFn = ReturnType<typeof useTranslation<"work-table">>["t"];

export const createPayRow = ({
  label,
  quantity,
  rate,
}: {
  label: string;
  quantity: number;
  rate: number;
}): PayRowVM => ({
  label,
  quantity,
  rate,
  total: quantity * rate,
});

export const mapPerDiemToPayRow = (
  points: number,
  rate: number,
  label: string,
): PayRowVM =>
  createPayRow({
    label,
    quantity: points,
    rate,
  });

export const mapMealAllowanceToPayRow = (
  entry: MealAllowanceEntry,
  rate: number,
  label: string,
): PayRowVM =>
  createPayRow({
    label,
    quantity: entry.points,
    rate,
  });

export const mapAllowanceRows = ({
  perDiem,
  mealAllowance,
  rates,
  rateDiem,
  t,
}: {
  perDiem: { points: number; rate: number };
  mealAllowance: MealAllowance;
  rates: MealAllowanceRates;
  rateDiem: number;
  t: TranslateFn;
}): PayRowVM[] => [
  mapPerDiemToPayRow(perDiem.points, rateDiem, t("pay_labels.per_diem")),
  mapMealAllowanceToPayRow(mealAllowance.large, rates.large, t("pay_labels.meal_large")),
  mapMealAllowanceToPayRow(mealAllowance.small, rates.small, t("pay_labels.meal_small")),
];
