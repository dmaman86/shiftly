import type { MealAllowance } from "../../types/data-shapes";
import type { MealAllowanceDayInfo } from "../../types/bundles";
import type { MealAllowanceRates } from "../../types/types";

/** Owns historical rates and daily meal-allowance eligibility. */
export class TimelineMealAllowanceCalculator {
  private readonly timeline: Array<{
    year: number;
    month: number;
    rates: MealAllowanceRates;
  }> = [
    { year: 2000, month: 1, rates: { small: 13.5, large: 19.7 } },
    { year: 2024, month: 9, rates: { small: 14.5, large: 21.1 } },
  ];

  calculateRates(params: { year: number; month: number }): MealAllowanceRates {
    const { year, month } = params;
    const applicable = this.timeline
      .filter(
        (entry) =>
          entry.year < year || (entry.year === year && entry.month <= month),
      )
      .sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.month - a.month,
      );

    return applicable[0]?.rates ?? { small: 0, large: 0 };
  }

  calculateAllowance(params: {
    day: MealAllowanceDayInfo;
    year: number;
    month: number;
  }): MealAllowance {
    const rates = this.calculateRates(params);
    const large = this.calculateLarge(params.day, rates.large);

    if (large.points > 0) {
      return { large, small: { points: 0, amount: 0 } };
    }

    return {
      large: { points: 0, amount: 0 },
      small: this.calculateSmall(params.day, rates.small),
    };
  }

  createEmpty(): MealAllowance {
    return {
      large: { points: 0, amount: 0 },
      small: { points: 0, amount: 0 },
    };
  }

  private calculateLarge(day: MealAllowanceDayInfo, rate: number) {
    if (day.totalHours >= 10 && !day.isFieldDutyDay) {
      return { points: 1, amount: rate };
    }

    return { points: 0, amount: 0 };
  }

  private calculateSmall(day: MealAllowanceDayInfo, rate: number) {
    if (day.nightHours >= 4) return { points: 1, amount: rate };

    return { points: 0, amount: 0 };
  }
}
