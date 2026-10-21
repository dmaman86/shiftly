import type { MealAllowance } from "../../types/data-shapes.js";
import type { MealAllowanceDayInfo } from "../../types/bundles.js";
import type { MealAllowanceRates } from "../../types/types.js";
import { BASELINE_REFERENCES } from "../../reference/baseline.js";
import {
  requireMonthValue,
  type ReferenceResolver,
} from "../../reference/reference-resolver.js";

const LARGE_ALLOWANCE_MIN_TOTAL_HOURS = 10;
const SMALL_ALLOWANCE_MIN_NIGHT_HOURS = 4;

/** Owns daily meal-allowance eligibility; the rates come from the reference timelines. */
export class TimelineMealAllowanceCalculator {
  private readonly references: ReferenceResolver;

  constructor(references: ReferenceResolver = BASELINE_REFERENCES) {
    this.references = references;
  }

  calculateRates(params: { year: number; month: number }): MealAllowanceRates {
    return requireMonthValue(this.references, "mealAllowanceRates", params);
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
    if (
      day.totalHours >= LARGE_ALLOWANCE_MIN_TOTAL_HOURS &&
      !day.isFieldDutyDay
    ) {
      return { points: 1, amount: rate };
    }

    return { points: 0, amount: 0 };
  }

  private calculateSmall(day: MealAllowanceDayInfo, rate: number) {
    if (day.nightHours >= SMALL_ALLOWANCE_MIN_NIGHT_HOURS) {
      return { points: 1, amount: rate };
    }

    return { points: 0, amount: 0 };
  }
}
