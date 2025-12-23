import { MealAllowance } from "../types/types";

export class MealAllowanceMonthReducer {
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

  subtract(base: MealAllowance, sub: MealAllowance): MealAllowance {
    return {
      large: {
        points: Math.max(0, base.large.points - sub.large.points),
        amount: Math.max(0, base.large.amount - sub.large.amount),
      },
      small: {
        points: Math.max(0, base.small.points - sub.small.points),
        amount: Math.max(0, base.small.amount - sub.small.amount),
      },
    };
  }
}
