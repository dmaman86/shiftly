import { describe, expect, it } from "vitest";

import { LargeMealAllowanceCalculator } from "@/domain/calculator/mealallowance/large-mealallowance.calculator";
import { SmallMealAllowanceCalculator } from "@/domain/calculator/mealallowance/small-mealallowance.calculator";
import { DefaultMealAllowanceCalculator } from "@/domain/calculator/mealallowance/meal-allowance.calculator";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("DefaultMealAllowanceCalculator", () => {
  const calculator = new DefaultMealAllowanceCalculator(
    new LargeMealAllowanceCalculator(),
    new SmallMealAllowanceCalculator(),
  );
  const rates = { small: 50, large: 100 };

  const calculate = (
    totalHours: number,
    nightHours: number,
    isFieldDutyDay = false,
  ) => {
    const day: MealAllowanceDayInfo = {
      totalHours,
      nightHours,
      isFieldDutyDay,
    };

    return calculator.calculate({ day, rates });
  };

  it("returns an empty allowance", () => {
    expect(calculator.createEmpty()).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 0, amount: 0 },
    });
  });

  it("prioritizes the large allowance when both conditions are met", () => {
    expect(calculate(19, 8)).toEqual({
      large: { points: 1, amount: rates.large },
      small: { points: 0, amount: 0 },
    });
  });

  it("returns the small allowance for a night shift of 10 hours", () => {
    expect(calculate(10, 6)).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 1, amount: rates.small },
    });
  });

  it("falls back to the small allowance on a field duty day", () => {
    expect(calculate(12, 6, true)).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 1, amount: rates.small },
    });
  });

  it("returns no allowance when neither condition is met", () => {
    expect(calculate(8, 4)).toEqual(calculator.createEmpty());
  });
});
