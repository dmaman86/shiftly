import { describe, it, expect, beforeEach } from "vitest";
import { RegularByDayCalculator } from "@/domain/calculator/regular/regularByDay.calculator";
import type { RegularInput, RegularConfig } from "@/domain/types/data-shapes";
import { WorkDayType } from "@/constants/fields.constant";

describe("RegularByDayCalculator", () => {
  let calculator: RegularByDayCalculator;

  beforeEach(() => {
    calculator = new RegularByDayCalculator();
  });

  describe("calculate - Regular Day", () => {
    it("should calculate hours within standard hours (all 100%)", () => {
      const input: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should calculate hours exactly at standard hours", () => {
      const input: RegularInput = {
        totalHours: 9,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should calculate overtime within midTierThreshold (100% + 125%)", () => {
      const input: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should calculate overtime exactly at midTierThreshold", () => {
      const input: RegularInput = {
        totalHours: 11,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should calculate overtime beyond midTierThreshold (100% + 125% + 150%)", () => {
      const input: RegularInput = {
        totalHours: 13,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 2 },
      });
    });

    it("should handle zero total hours", () => {
      const input: RegularInput = {
        totalHours: 0,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle decimal hours", () => {
      const input: RegularInput = {
        totalHours: 10.5,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result.hours100.hours).toBe(9);
      expect(result.hours125.hours).toBeCloseTo(1.5);
      expect(result.hours150.hours).toBe(0);
    });

    it("should handle large overtime hours", () => {
      const input: RegularInput = {
        totalHours: 20,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 9 },
      });
    });
  });

  describe("calculate - Special Full Day without cross-day continuation", () => {
    it("should assign all hours to 150% tier for SpecialFull day", () => {
      const input: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 10 },
      });
    });

    it("should handle zero hours on SpecialFull day", () => {
      const input: RegularInput = {
        totalHours: 0,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle decimal hours on SpecialFull day", () => {
      const input: RegularInput = {
        totalHours: 8.5,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 8.5 },
      });
    });

    it("should handle large hours on SpecialFull day", () => {
      const input: RegularInput = {
        totalHours: 24,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 24 },
      });
    });
  });

  describe("calculate - Special Full Day with cross-day continuation", () => {
    it("should calculate normally when crossDayContinuation is true", () => {
      const input: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: true,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should calculate with large overtime when crossDayContinuation is true", () => {
      const input: RegularInput = {
        totalHours: 15,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: true,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 4 },
      });
    });
  });

  describe("calculate - SpecialPartialStart Day", () => {
    it("should calculate normally for SpecialPartialStart", () => {
      const input: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialPartialStart,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle SpecialPartialStart with no overtime", () => {
      const input: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialPartialStart,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle SpecialPartialStart with crossDayContinuation", () => {
      const input: RegularInput = {
        totalHours: 12,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialPartialStart,
          crossDayContinuation: true,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      });
    });
  });

  describe("calculate - with custom config", () => {
    it("should use custom midTierThreshold", () => {
      const customCalculator = new RegularByDayCalculator({
        midTierThreshold: 3,
      });

      const input: RegularInput = {
        totalHours: 13,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = customCalculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 1 },
      });
    });

    it("should use custom percentages", () => {
      const customCalculator = new RegularByDayCalculator({
        percentages: {
          hours100: 1.1,
          hours125: 1.4,
          hours150: 2.0,
        },
      });

      const input: RegularInput = {
        totalHours: 12,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = customCalculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1.1, hours: 9 },
        hours125: { percent: 1.4, hours: 2 },
        hours150: { percent: 2.0, hours: 1 },
      });
    });

    it("should use custom config on SpecialFull day", () => {
      const customCalculator = new RegularByDayCalculator({
        percentages: {
          hours100: 1.2,
          hours125: 1.5,
          hours150: 2.5,
        },
      });

      const input: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = customCalculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1.2, hours: 0 },
        hours125: { percent: 1.5, hours: 0 },
        hours150: { percent: 2.5, hours: 10 },
      });
    });

    it("should use full custom config", () => {
      const customConfig: RegularConfig = {
        midTierThreshold: 4,
        percentages: {
          hours100: 1.0,
          hours125: 1.3,
          hours150: 1.8,
        },
      };

      const customCalculator = new RegularByDayCalculator(customConfig);

      const input: RegularInput = {
        totalHours: 15,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = customCalculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1.0, hours: 9 },
        hours125: { percent: 1.3, hours: 4 },
        hours150: { percent: 1.8, hours: 2 },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle standardHours of zero", () => {
      const input: RegularInput = {
        totalHours: 5,
        standardHours: 0,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 3 },
      });
    });

    it("should handle very small decimal hours", () => {
      const input: RegularInput = {
        totalHours: 9.01,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result.hours100.hours).toBe(9);
      expect(result.hours125.hours).toBeCloseTo(0.01);
      expect(result.hours150.hours).toBe(0);
    });

    it("should handle totalHours less than standardHours with overflow calculation", () => {
      const input: RegularInput = {
        totalHours: 5,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle exact midTierThreshold boundary", () => {
      const input: RegularInput = {
        totalHours: 11,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle one minute over midTierThreshold", () => {
      const input: RegularInput = {
        totalHours: 11 + 1 / 60,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result.hours100.hours).toBe(9);
      expect(result.hours125.hours).toBe(2);
      expect(result.hours150.hours).toBeCloseTo(1 / 60);
    });
  });

  describe("integration with BaseRegularCalculator methods", () => {
    it("should produce results compatible with accumulate", () => {
      const input1: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const input2: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-02",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result1 = calculator.calculate(input1);
      const result2 = calculator.calculate(input2);
      const accumulated = calculator.accumulate(result1, result2);

      expect(accumulated).toEqual({
        hours100: { percent: 1, hours: 17 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should produce results compatible with subtract", () => {
      const input1: RegularInput = {
        totalHours: 13,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const input2: RegularInput = {
        totalHours: 10,
        standardHours: 9,
        meta: {
          date: "2024-01-02",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result1 = calculator.calculate(input1);
      const result2 = calculator.calculate(input2);
      const subtracted = calculator.subtract(result1, result2);

      expect(subtracted).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 2 },
      });
    });

    it("should work with createEmpty for accumulation", () => {
      const input: RegularInput = {
        totalHours: 12,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const empty = calculator.createEmpty();
      const result = calculator.calculate(input);
      const accumulated = calculator.accumulate(empty, result);

      expect(accumulated).toEqual(result);
    });
  });
});
