import {
  MealAllowance,
  MealAllowanceDayInfo,
  MealAllowanceRates,
  LargeMealAllowanceCalculator,
  SmallMealAllowanceCalculator,
  Resolver,
} from "@/domain";

export class MealAllowanceResolver implements Resolver<
  {
    day: MealAllowanceDayInfo;
    rates: MealAllowanceRates;
  },
  MealAllowance
> {
  constructor(
    private readonly largeCalculator: LargeMealAllowanceCalculator,
    private readonly smallCalculator: SmallMealAllowanceCalculator,
  ) {}

  createEmpty(): MealAllowance {
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
