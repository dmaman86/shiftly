import { describe, expect, it } from "vitest";

import { TimelineMealAllowanceCalculator } from "@/domain/calculator/mealallowance/timeline-meal-allowance.calculator";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("TimelineMealAllowanceCalculator allowance policy", () => {
  const calculator = new TimelineMealAllowanceCalculator();
  const rates = { small: 14.5, large: 21.1 };

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

    return calculator.calculateAllowance({ day, year: 2024, month: 10 });
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

  it("prioritizes the large allowance at exactly 10 hours", () => {
    expect(calculate(10, 6)).toEqual({
      large: { points: 1, amount: rates.large },
      small: { points: 0, amount: 0 },
    });
  });

  it("falls back to the small allowance on a field duty day", () => {
    expect(calculate(12, 6, true)).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 1, amount: rates.small },
    });
  });

  it("returns the small allowance at exactly 4 night hours", () => {
    expect(calculate(8, 4)).toEqual({
      large: { points: 0, amount: 0 },
      small: { points: 1, amount: rates.small },
    });
  });
});
