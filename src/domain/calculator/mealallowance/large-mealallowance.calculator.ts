import { MealAllowanceDayInfo, MealAllowanceEntry } from "@/domain/types/types";

export class LargeMealAllowanceCalculator {
  calculate(params: {
    day: MealAllowanceDayInfo;
    rate: number;
  }): MealAllowanceEntry {
    const { totalHours, hasMorning, hasNight, isFieldDutyDay } = params.day;

    if (totalHours < 10) return { points: 0, amount: 0 };

    if (hasMorning && hasNight) {
      if (!isFieldDutyDay) return { points: 1, amount: params.rate };
      return { points: 0, amount: 0 };
    }

    const isDayShift = hasMorning && !hasNight;

    if (!isDayShift) return { points: 1, amount: params.rate };

    if (isDayShift && !isFieldDutyDay)
      return { points: 1, amount: params.rate };

    return { points: 0, amount: 0 };
  }
}
