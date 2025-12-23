import { LargeMealAllowanceCalculator } from "../calculator/mealallowance/large-mealallowance.calculator";
import { SmallMealAllowanceCalculator } from "../calculator/mealallowance/small-mealallowance.calculator";
import {
  MealAllowance,
  MealAllowanceDayInfo,
  MealAllowanceRates,
} from "../types/types";

export class MealAllowanceResolver {
  constructor(
    private readonly largeCalculator: LargeMealAllowanceCalculator,
    private readonly smallCalculator: SmallMealAllowanceCalculator,
  ) {}

  create(): MealAllowance {
    return {
      large: { points: 0, amount: 0 },
      small: { points: 0, amount: 0 },
    };
  }

  resolve(params: {
    day: MealAllowanceDayInfo;
    rates: MealAllowanceRates;
  }): MealAllowance {
    const large = this.largeCalculator.calculate({
      day: params.day,
      rate: params.rates.large,
    });

    if (large.points > 0) {
      return {
        large,
        small: { points: 0, amount: 0 },
      };
    }

    const small = this.smallCalculator.calculate({
      day: params.day,
      rate: params.rates.small,
    });

    return {
      large: { points: 0, amount: 0 },
      small,
    };
  }
}
