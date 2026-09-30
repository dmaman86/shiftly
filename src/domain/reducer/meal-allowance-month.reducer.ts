import { Reducer } from "../types/core-behaviors";
import { MealAllowance } from "../types/data-shapes";

export class MealAllowanceMonthReducer implements Reducer<MealAllowance> {
  createEmpty(): MealAllowance {
    return {
      large: { points: 0, amount: 0 },
      small: { points: 0, amount: 0 },
    };
  }

  accumulate(base: MealAllowance, add: MealAllowance): MealAllowance {
    return {
      large: {
        points: base.large.points + add.large.points,
        amount: base.large.amount + add.large.amount,
      },
      small: {
        points: base.small.points + add.small.points,
        amount: base.small.amount + add.small.amount,
      },
    };
  }
}
