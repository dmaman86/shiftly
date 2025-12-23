import {
  MealAllowance,
  MealAllowanceEntry,
  MealAllowanceRates,
  Segment,
} from "@/domain";
import { PayRowVM } from "../PayRowVM";

export const buildPayRowsFromSegments = (
  baseRate: number,
  map: Record<string, Segment>,
): PayRowVM[] => {
  return Object.entries(map).map(([label, segment]) => {
    const rate = baseRate * segment.percent;
    const total = segment.hours * rate;

    return {
      label,
      quantity: Number(segment.hours.toFixed(2)),
      rate,
      total,
    };
  });
};

export const buildPerDiemRow = (
  points: number,
  rate: number,
  label = "אש״ל",
): PayRowVM => ({
  label,
  quantity: points,
  rate,
  total: points * rate,
});

export const buildMealAllowanceRow = (
  entry: MealAllowanceEntry,
  rate: number,
  label: string,
): PayRowVM => {
  return {
    label,
    quantity: entry.points,
    rate,
    total: entry.points * rate,
  };
};

export const buildAllowanceRows = (params: {
  perDiem: { points: number; rate: number };
  mealAllowance: MealAllowance;
  rates: MealAllowanceRates;
  rateDiem: number;
}): PayRowVM[] => {
  const rows: PayRowVM[] = [];

  const { perDiem, mealAllowance, rates, rateDiem } = params;

  rows.push(buildPerDiemRow(perDiem.points, rateDiem));

  const rowLarge = buildMealAllowanceRow(
    mealAllowance.large,
    rates.large,
    "כלכלה גדולה",
  );

  const rowSmall = buildMealAllowanceRow(
    mealAllowance.small,
    rates.small,
    "כלכלה קטנה",
  );

  rows.push(rowLarge, rowSmall);

  return rows;
};
