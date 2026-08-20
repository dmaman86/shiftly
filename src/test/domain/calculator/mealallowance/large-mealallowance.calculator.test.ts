import { describe, expect, it } from "vitest";

import { LargeMealAllowanceCalculator } from "@/domain/calculator/mealallowance/large-mealallowance.calculator";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("LargeMealAllowanceCalculator", () => {
  const calculator = new LargeMealAllowanceCalculator();
  const rate = 100;

  const createDay = (
    totalHours: number,
    isFieldDutyDay = false,
    nightHours = 0,
  ): MealAllowanceDayInfo => ({
    totalHours,
    nightHours,
    isFieldDutyDay,
  });

  it("grants one allowance when daily hours exceed 10 outside field duty", () => {
    expect(
      calculator.calculate({ day: createDay(10.01), rate }),
    ).toEqual({ points: 1, amount: rate });
  });

  it("does not grant an allowance at exactly 10 daily hours", () => {
    expect(calculator.calculate({ day: createDay(10), rate })).toEqual({
      points: 0,
      amount: 0,
    });
  });

  it("does not grant an allowance below 10 daily hours", () => {
    expect(calculator.calculate({ day: createDay(9.99), rate })).toEqual({
      points: 0,
      amount: 0,
    });
  });

  it("does not grant an allowance on a field duty day", () => {
    expect(
      calculator.calculate({ day: createDay(19, true, 8), rate }),
    ).toEqual({ points: 0, amount: 0 });
  });

  it("does not depend on the number of night hours", () => {
    const dayOnly = calculator.calculate({ day: createDay(12), rate });
    const withNight = calculator.calculate({ day: createDay(12, false, 8), rate });

    expect(dayOnly).toEqual({ points: 1, amount: rate });
    expect(withNight).toEqual(dayOnly);
  });
});
