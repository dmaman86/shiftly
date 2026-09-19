import type { useTranslation } from "react-i18next";
import {
  MealAllowance,
  MealAllowanceEntry,
  MealAllowanceRates,
} from "@/domain";
import { PayRowVM } from "@/features/salary-summary";

type TranslateFn = ReturnType<typeof useTranslation<"work-table">>["t"];

export const createPayRow = ({
  id,
  label,
  quantity,
  rate,
  tooltip,
}: {
  id: string;
  label: string;
  quantity: number;
  rate: number;
  tooltip?: string;
}): PayRowVM => ({
  id,
  label,
  quantity,
  rate,
  total: quantity * rate,
  tooltip,
});

export const mapPerDiemToPayRow = (
  id: string,
  points: number,
  rate: number,
  label: string,
  tooltip?: string,
): PayRowVM =>
  createPayRow({
    id,
    label,
    quantity: points,
    rate,
    tooltip,
  });

export const mapMealAllowanceToPayRow = (
  id: string,
  entry: MealAllowanceEntry,
  rate: number,
  label: string,
  tooltip?: string,
): PayRowVM =>
  createPayRow({
    id,
    label,
    quantity: entry.points,
    rate,
    tooltip,
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
  mapPerDiemToPayRow(
    "perDiem",
    perDiem.points,
    rateDiem,
    t("pay_labels.per_diem"),
    t("headers.meal_allowance"),
  ),
  mapMealAllowanceToPayRow(
    "mealLarge",
    mealAllowance.large,
    rates.large,
    t("pay_labels.meal_large"),
    t("pay_labels.meal_large_short"),
  ),
  mapMealAllowanceToPayRow(
    "mealSmall",
    mealAllowance.small,
    rates.small,
    t("pay_labels.meal_small"),
    t("pay_labels.meal_small_short"),
  ),
];
