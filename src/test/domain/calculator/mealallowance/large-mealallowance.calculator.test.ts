import { describe, it, expect, beforeEach } from "vitest";
import { LargeMealAllowanceCalculator } from "@/domain/calculator/mealallowance/large-mealallowance.calculator";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";

describe("LargeMealAllowanceCalculator", () => {
  let calculator: LargeMealAllowanceCalculator;

  beforeEach(() => {
    calculator = new LargeMealAllowanceCalculator();
  });

  describe("calculate - Less than 10 hours", () => {
    it("should return 0 points and 0 amount for shifts less than 10 hours", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 9,
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

    it("should return 0 for 8 hours with both morning and night", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 8,
        hasMorning: true,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 for 5 hours night shift", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 5,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should return 0 for 9.99 hours (boundary case)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 9.99,
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

    it("should return 0 for 0 hours", () => {
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
  });

  describe("calculate - 10+ hours with morning AND night (round-the-clock)", () => {
    it("should return 1 point for non-field duty day with morning and night", () => {
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

    it("should return 0 for field duty day with morning and night", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: true,
        hasNight: true,
        isFieldDutyDay: true,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });

    it("should calculate with different rate (150) for non-field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 15,
        hasMorning: true,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 150 });

      expect(result).toEqual({
        points: 1,
        amount: 150,
      });
    });

    it("should work for exactly 10 hours with morning and night", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
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

    it("should work for 24 hours (full day) non-field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 24,
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

    it("should return 0 for 24 hours field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 24,
        hasMorning: true,
        hasNight: true,
        isFieldDutyDay: true,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 0,
        amount: 0,
      });
    });
  });

  describe("calculate - 10+ hours with ONLY night (no morning)", () => {
    it("should return 1 point for night-only shift (non-field duty)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
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

    it("should return 1 point for night-only shift (field duty)", () => {
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

    it("should work with different rate (75) for night shift", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: false,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 75 });

      expect(result).toEqual({
        points: 1,
        amount: 75,
      });
    });

    it("should work for long night shift (15 hours)", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 15,
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
  });

  describe("calculate - 10+ hours with ONLY morning (day shift)", () => {
    it("should return 1 point for day shift with non-field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
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

    it("should work with different rate (200) for day shift non-field", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 200 });

      expect(result).toEqual({
        points: 1,
        amount: 200,
      });
    });

    it("should return 0 for long day shift (15 hours) with field duty", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 15,
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
  });

  describe("calculate - 10+ hours with NO morning and NO night", () => {
    it("should return 1 point when no morning or night flags", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
        hasMorning: false,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should return 1 point even with field duty when no morning/night", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
        hasMorning: false,
        hasNight: false,
        isFieldDutyDay: true,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });
  });

  describe("calculate - Rate variations", () => {
    it("should handle rate of 0", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 0 });

      expect(result).toEqual({
        points: 1,
        amount: 0,
      });
    });

    it("should handle decimal rates", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10,
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

    it("should handle very high rates", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: true,
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

  describe("calculate - Decimal hours", () => {
    it("should handle exactly 10.0 hours", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10.0,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: false,
      };

      const result = calculator.calculate({ day, rate: 100 });

      expect(result).toEqual({
        points: 1,
        amount: 100,
      });
    });

    it("should handle 10.5 hours", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 10.5,
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

    it("should handle 12.75 hours", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12.75,
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
  });

  describe("calculate - Logic flow summary", () => {
    it("RULE 1: Less than 10 hours -> always 0", () => {
      const scenarios = [
        { hasMorning: true, hasNight: false, isFieldDutyDay: false },
        { hasMorning: true, hasNight: false, isFieldDutyDay: true },
        { hasMorning: false, hasNight: true, isFieldDutyDay: false },
        { hasMorning: false, hasNight: true, isFieldDutyDay: true },
        { hasMorning: true, hasNight: true, isFieldDutyDay: false },
        { hasMorning: true, hasNight: true, isFieldDutyDay: true },
      ];

      scenarios.forEach((flags) => {
        const result = calculator.calculate({
          day: { totalHours: 9, ...flags },
          rate: 100,
        });
        expect(result).toEqual({ points: 0, amount: 0 });
      });
    });

    it("RULE 2: 10+ hours, morning AND night, non-field -> 1 point", () => {
      const result = calculator.calculate({
        day: {
          totalHours: 10,
          hasMorning: true,
          hasNight: true,
          isFieldDutyDay: false,
        },
        rate: 100,
      });
      expect(result).toEqual({ points: 1, amount: 100 });
    });

    it("RULE 3: 10+ hours, morning AND night, field duty -> 0", () => {
      const result = calculator.calculate({
        day: {
          totalHours: 10,
          hasMorning: true,
          hasNight: true,
          isFieldDutyDay: true,
        },
        rate: 100,
      });
      expect(result).toEqual({ points: 0, amount: 0 });
    });

    it("RULE 4: 10+ hours, night only (no morning) -> 1 point (regardless of field duty)", () => {
      const nonField = calculator.calculate({
        day: {
          totalHours: 10,
          hasMorning: false,
          hasNight: true,
          isFieldDutyDay: false,
        },
        rate: 100,
      });
      const field = calculator.calculate({
        day: {
          totalHours: 10,
          hasMorning: false,
          hasNight: true,
          isFieldDutyDay: true,
        },
        rate: 100,
      });

      expect(nonField).toEqual({ points: 1, amount: 100 });
      expect(field).toEqual({ points: 1, amount: 100 });
    });

    it("RULE 5: 10+ hours, day shift (morning only), non-field -> 1 point", () => {
      const result = calculator.calculate({
        day: {
          totalHours: 10,
          hasMorning: true,
          hasNight: false,
          isFieldDutyDay: false,
        },
        rate: 100,
      });
      expect(result).toEqual({ points: 1, amount: 100 });
    });

    it("RULE 6: 10+ hours, day shift (morning only), field duty -> 0", () => {
      const result = calculator.calculate({
        day: {
          totalHours: 10,
          hasMorning: true,
          hasNight: false,
          isFieldDutyDay: true,
        },
        rate: 100,
      });
      expect(result).toEqual({ points: 0, amount: 0 });
    });
  });

  describe("immutability", () => {
    it("should not modify the input day object", () => {
      const day: MealAllowanceDayInfo = {
        totalHours: 12,
        hasMorning: true,
        hasNight: true,
        isFieldDutyDay: false,
      };

      const originalDay = { ...day };

      calculator.calculate({ day, rate: 100 });

      expect(day).toEqual(originalDay);
    });
  });
});
