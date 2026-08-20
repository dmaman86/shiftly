import { describe, expect, it } from "vitest";

import { LargeMealAllowanceCalculator } from "@/domain/calculator/mealallowance/large-mealallowance.calculator";
import { SmallMealAllowanceCalculator } from "@/domain/calculator/mealallowance/small-mealallowance.calculator";
import { MealAllowanceResolver } from "@/domain/resolve/meal-allowance.resolver";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("MealAllowanceResolver", () => {
  const resolver = new MealAllowanceResolver(
    new LargeMealAllowanceCalculator(),
    new SmallMealAllowanceCalculator(),
  );
  const rates = { small: 50, large: 100 };

  const resolve = (
    totalHours: number,
    nightHours: number,
    isFieldDutyDay = false,
  ) => {
    const day: MealAllowanceDayInfo = {
      totalHours,
      nightHours,
      isFieldDutyDay,
    };

    return resolver.resolve({ day, rates });
  };

  it("returns an empty allowance", () => {
    expect(resolver.createEmpty()).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 0, amount: 0 },
    });
  });

  it("prioritizes the large allowance when both conditions are met", () => {
    expect(resolve(19, 8)).toEqual({
      large: { points: 1, amount: rates.large },
      small: { points: 0, amount: 0 },
    });
  });

  it("returns the small allowance for a night shift of 10 hours", () => {
    expect(resolve(10, 6)).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 1, amount: rates.small },
    });
  });

  it("falls back to the small allowance on a field duty day", () => {
    expect(resolve(12, 6, true)).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 1, amount: rates.small },
    });
  });

  it("returns no allowance when neither condition is met", () => {
    expect(resolve(8, 4)).toEqual(resolver.createEmpty());
  });
});
