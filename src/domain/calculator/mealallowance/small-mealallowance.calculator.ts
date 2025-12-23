import { MealAllowanceDayInfo, MealAllowanceEntry } from "@/domain/types/types";

export class SmallMealAllowanceCalculator {
  calculate(params: {
    day: MealAllowanceDayInfo;
    rate: number;
  }): MealAllowanceEntry {
    const { hasNight } = params.day;

    if (hasNight) return { points: 1, amount: params.rate };

    return { points: 0, amount: 0 };
  }
}
