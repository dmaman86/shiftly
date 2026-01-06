import { describe, it, expect, beforeEach } from "vitest";
import { SmallMealAllowanceCalculator } from "@/domain/calculator/mealallowance/small-mealallowance.calculator";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("SmallMealAllowanceCalculator", () => {
  let calculator: SmallMealAllowanceCalculator;

  beforeEach(() => {
    calculator = new SmallMealAllowanceCalculator();
  });

  describe("calculate - Has night shift", () => {
    it("should return 1 point and rate amount when hasNight is true", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should return 1 point even with 0 total hours if hasNight", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 0,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should return 1 point for night shift with morning flag", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: true,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should return 1 point for night shift with field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: true,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should work with different rate (150)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 150 });

      expect(result).toEqual({
        points: 1,
        amount: 150,
      });
    });

    it("should work with rate of 0", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 0 });

      expect(result).toEqual({
        points: 1,
        amount: 0,
      });
    });

    it("should work with decimal rate", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 99.5 });

      expect(result).toEqual({
        points: 1,
        amount: 99.5,
      });
    });

    it("should work with very high rates", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 999 });

      expect(result).toEqual({
        points: 1,
        amount: 999,
      });
    });
  });

  describe("calculate - No night shift", () => {
    it("should return 0 points when hasNight is false", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 for day shift with 12 hours", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 for day shift with field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: true,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 when no morning and no night", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 for 0 hours with no night", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 0,
        hasMorning: false,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 for long day shift (20 hours)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 20,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });
  });

  describe("calculate - Decimal hours", () => {
    it("should work with decimal total hours (8.5)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8.5,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should work with decimal total hours (10.75)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10.75,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });
  });

  describe("calculate - Logic summary", () => {
    it("RULE: hasNight = true -> 1 point (regardless of other flags)", () => {
      const scenarios = [
        { hasMorning: true, isFieldDutyDay: false },
        { hasMorning: true, isFieldDutyDay: true },
        { hasMorning: false, isFieldDutyDay: false },
        { hasMorning: false, isFieldDutyDay: true },
      ];

      scenarios.forEach((flags) => {
        const result = calculator.calculate({
          day: { totalHours: 8, hasNight: true, ...flags },
          rate: 100,
        });
        expect(result).toEqual({ points: 1, amount: 100 });
      });
    });

    it("RULE: hasNight = false -> 0 points (regardless of other flags)", () => {
      const scenarios = [
        { hasMorning: true, isFieldDutyDay: false },
        { hasMorning: true, isFieldDutyDay: true },
        { hasMorning: false, isFieldDutyDay: false },
        { hasMorning: false, isFieldDutyDay: true },
      ];

      scenarios.forEach((flags) => {
        const result = calculator.calculate({
          day: { totalHours: 8, hasNight: false, ...flags },
          rate: 100,
        });
        expect(result).toEqual({ points: 0, amount: 0 });
      });
    });
  });

  describe("immutability", () => {
    it("should not modify the input day object", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const originalDay = { ...day };

      calculator.calculate({ day, rate: 100 });

      expect(day).toEqual(originalDay);
    });
  });
});
