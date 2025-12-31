import {
  MealAllowance,
  MealAllowanceEntry,
  MealAllowanceRates,
} from "@/domain";
import { PayRowVM } from "@/features/salary-summary";

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
  label = "קצובת כלכלה",
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
}: {
  perDiem: { points: number; rate: number };
  mealAllowance: MealAllowance;
  rates: MealAllowanceRates;
  rateDiem: number;
}): PayRowVM[] => [
  mapPerDiemToPayRow(perDiem.points, rateDiem),
  mapMealAllowanceToPayRow(mealAllowance.large, rates.large, "דמי כלכלה"),
  mapMealAllowanceToPayRow(
    mealAllowance.small,
    rates.small,
    "תוספת כלכלה למשמרת ג",
  ),
];
