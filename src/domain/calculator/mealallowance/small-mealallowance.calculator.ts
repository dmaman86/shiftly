import {
  Calculator,
  MealAllowanceCalcParams,
  MealAllowanceEntry,
} from "@/domain";

export class SmallMealAllowanceCalculator
  implements Calculator<MealAllowanceCalcParams, MealAllowanceEntry>
{
  calculate(params: MealAllowanceCalcParams): MealAllowanceEntry {
    const { day, rate } = params;

    if (day.hasNight) return { points: 1, amount: rate };

    return { points: 0, amount: 0 };
  }
}
