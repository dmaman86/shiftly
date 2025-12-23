import { MealAllowanceRates } from "../types/types";

export class TimelineMealAllowanceRateResolver {
  private readonly timeline: Array<{
    year: number;
    month: number;
    rates: MealAllowanceRates;
  }> = [
    { year: 2000, month: 1, rates: { small: 13.5, large: 19.7 } },
    { year: 2024, month: 9, rates: { small: 14.5, large: 21.1 } },
  ];

  getRates(year: number, month: number): MealAllowanceRates {
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
}
