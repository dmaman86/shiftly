import { describe, expect, it } from "vitest";

import { SmallMealAllowanceCalculator } from "@/domain/calculator/mealallowance/small-mealallowance.calculator";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("SmallMealAllowanceCalculator", () => {
  const calculator = new SmallMealAllowanceCalculator();
  const rate = 50;

  const createDay = (
    nightHours: number,
    isFieldDutyDay = false,
  ): MealAllowanceDayInfo => ({
    totalHours: 8,
    nightHours,
    isFieldDutyDay,
  });

  it("grants one allowance when night hours exceed 4", () => {
    expect(
      calculator.calculate({ day: createDay(4.01), rate }),
    ).toEqual({ points: 1, amount: rate });
  });

  it("does not grant an allowance at exactly 4 night hours", () => {
    expect(calculator.calculate({ day: createDay(4), rate })).toEqual({
      points: 0,
      amount: 0,
    });
  });

  it("does not grant an allowance below 4 night hours", () => {
    expect(calculator.calculate({ day: createDay(3.99), rate })).toEqual({
      points: 0,
      amount: 0,
    });
  });

  it("can grant the allowance on a field duty day", () => {
    expect(
      calculator.calculate({ day: createDay(5, true), rate }),
    ).toEqual({ points: 1, amount: rate });
  });
});
