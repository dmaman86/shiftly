import { beforeEach, describe, expect, it } from "vitest";
import { TimelineMealAllowanceCalculator } from "../../../src/calculator/mealallowance/timeline-meal-allowance.calculator.js";
import type { MealAllowanceRates } from "../../../src/types/types.js";

describe("TimelineMealAllowanceCalculator rates", () => {
  let calculator: TimelineMealAllowanceCalculator;

  const ratesBeforeTimeline: MealAllowanceRates = { small: 0, large: 0 };

  beforeEach(() => {
    calculator = new TimelineMealAllowanceCalculator();
  });

  describe("timeline boundaries", () => {
    it("returns zero before the supported timeline", () => {
      expect(calculator.calculateRates({ year: 1999, month: 12 })).toEqual(
        ratesBeforeTimeline,
      );
    });

    it("uses the provisional baseline rates before July 2021", () => {
      expect(calculator.calculateRates({ year: 2000, month: 1 })).toEqual({
        small: 11.8,
        large: 17.1,
      });
      expect(calculator.calculateRates({ year: 2021, month: 6 })).toEqual({
        small: 11.8,
        large: 17.1,
      });
    });

    it("uses the July 2021 rates", () => {
      expect(calculator.calculateRates({ year: 2021, month: 7 })).toEqual({
        small: 12.6,
        large: 18.3,
      });
      expect(calculator.calculateRates({ year: 2022, month: 9 })).toEqual({
        small: 12.6,
        large: 18.3,
      });
    });

    it("uses the verified October 2022 rates", () => {
      expect(calculator.calculateRates({ year: 2022, month: 10 })).toEqual({
        small: 13.5,
        large: 19.7,
      });
      expect(calculator.calculateRates({ year: 2024, month: 8 })).toEqual({
        small: 13.5,
        large: 19.7,
      });
    });

    it("uses the verified September 2024 rates", () => {
      expect(calculator.calculateRates({ year: 2024, month: 9 })).toEqual({
        small: 14.5,
        large: 21.1,
      });
      expect(calculator.calculateRates({ year: 2030, month: 1 })).toEqual({
        small: 14.5,
        large: 21.1,
      });
    });
  });
});
