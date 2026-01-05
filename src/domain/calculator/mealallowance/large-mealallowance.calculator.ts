import {
  MealAllowanceEntry,
  MealAllowanceCalcParams,
  Calculator,
} from "@/domain";

export class LargeMealAllowanceCalculator implements Calculator<
  MealAllowanceCalcParams,
  MealAllowanceEntry
> {
  calculate(params: MealAllowanceCalcParams): MealAllowanceEntry {
    const { day, rate } = params;
    const { totalHours, hasMorning, hasNight, isFieldDutyDay } = day;

    if (totalHours < 10) return { points: 0, amount: 0 };

    if (hasMorning && hasNight) {
      if (!isFieldDutyDay) return { points: 1, amount: rate };
      return { points: 0, amount: 0 };
    }

    const isDayShift = hasMorning && !hasNight;

    if (!isDayShift) return { points: 1, amount: rate };

    if (isDayShift && !isFieldDutyDay) return { points: 1, amount: rate };

    return { points: 0, amount: 0 };
  }
}
