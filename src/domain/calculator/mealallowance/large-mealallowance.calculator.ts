import type {
  MealAllowanceEntry,
  MealAllowanceCalcParams,
} from "../../types/data-shapes";
import type { Calculator } from "../../types/core-behaviors";

export class LargeMealAllowanceCalculator implements Calculator<
  MealAllowanceCalcParams,
  MealAllowanceEntry
> {
  calculate(params: MealAllowanceCalcParams): MealAllowanceEntry {
    const { day, rate } = params;

    if (day.totalHours > 10 && !day.isFieldDutyDay) {
      return { points: 1, amount: rate };
    }

    return { points: 0, amount: 0 };
  }
}
