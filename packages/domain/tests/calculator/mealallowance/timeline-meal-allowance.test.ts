import { beforeEach, describe, expect, it } from "vitest";
import { TimelineMealAllowanceCalculator } from "../../../src/calculator/mealallowance/timeline-meal-allowance.calculator.js";
import { ReferenceValueUnavailableError } from "../../../src/reference/reference-resolver.js";

describe("TimelineMealAllowanceCalculator rates", () => {
  let calculator: TimelineMealAllowanceCalculator;

  beforeEach(() => {
    calculator = new TimelineMealAllowanceCalculator();
  });

  describe("timeline boundaries", () => {
    it("refuses months before the supported period instead of returning zero", () => {
      expect(() =>
        calculator.calculateRates({ year: 2015, month: 10 }),
      ).toThrow(
        new ReferenceValueUnavailableError(
          "mealAllowanceRates",
          "2015-10-01",
          "out_of_range",
        ),
      );
      expect(() =>
        calculator.calculateRates({ year: 1999, month: 12 }),
      ).toThrow(ReferenceValueUnavailableError);
    });

    it("uses the provisional baseline rates before July 2021", () => {
      expect(calculator.calculateRates({ year: 2015, month: 11 })).toEqual({
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
