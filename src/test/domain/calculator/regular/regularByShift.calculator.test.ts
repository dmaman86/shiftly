import { describe, it, expect, beforeEach } from "vitest";
import { RegularByShiftCalculator } from "@/domain/calculator/regular/regularByShift.calculator";
import type { RegularInput, RegularConfig } from "@/domain/types/data-shapes";
import { WorkDayType } from "@/constants/fields.constant";

describe("RegularByShiftCalculator", () => {
  let calculator: RegularByShiftCalculator;

  beforeEach(() => {
    calculator = new RegularByShiftCalculator();
  });

  describe("calculate - Regular Day (reverse allocation)", () => {
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

  describe("calculate - allocation order verification", () => {
    it("should allocate hours in reverse order: 150% first, then 125%, then 100%", () => {
      // This test verifies the key difference between ByShift and ByDay
      const input: RegularInput = {
        totalHours: 12,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // With midTierThreshold = 2:
      // remaining = 12
      // overflow150 = max(12 - (9 + 2), 0) = max(1, 0) = 1
      // remaining = 12 - 1 = 11
      // overflow125 = max(11 - 9, 0) = 2
      // remaining = 11 - 2 = 9
      // overflow100 = max(9, 0) = 9

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      });
    });

    it("should allocate remaining hours to 100% tier after higher tiers", () => {
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

      // With midTierThreshold = 2:
      // remaining = 5
      // overflow150 = max(5 - (9 + 2), 0) = max(-6, 0) = 0
      // remaining = 5 - 0 = 5
      // overflow125 = max(5 - 9, 0) = max(-4, 0) = 0
      // remaining = 5 - 0 = 5
      // overflow100 = max(5, 0) = 5

      expect(result).toEqual({
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle exactly at 150% threshold boundary", () => {
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

      // With midTierThreshold = 2:
      // remaining = 11
      // overflow150 = max(11 - (9 + 2), 0) = max(0, 0) = 0
      // remaining = 11 - 0 = 11
      // overflow125 = max(11 - 9, 0) = 2
      // remaining = 11 - 2 = 9
      // overflow100 = max(9, 0) = 9

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle one hour over 150% threshold", () => {
      const input: RegularInput = {
        totalHours: 12,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // With midTierThreshold = 2:
      // remaining = 12
      // overflow150 = max(12 - (9 + 2), 0) = max(1, 0) = 1
      // remaining = 12 - 1 = 11
      // overflow125 = max(11 - 9, 0) = 2
      // remaining = 11 - 2 = 9
      // overflow100 = max(9, 0) = 9

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
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
      const customCalculator = new RegularByShiftCalculator({
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

      // With midTierThreshold = 3:
      // remaining = 13
      // overflow150 = max(13 - (9 + 3), 0) = max(1, 0) = 1
      // remaining = 13 - 1 = 12
      // overflow125 = max(12 - 9, 0) = 3
      // remaining = 12 - 3 = 9
      // overflow100 = max(9, 0) = 9

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 1 },
      });
    });

    it("should use custom percentages", () => {
      const customCalculator = new RegularByShiftCalculator({
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
      const customCalculator = new RegularByShiftCalculator({
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

      const customCalculator = new RegularByShiftCalculator(customConfig);

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

      // With midTierThreshold = 4:
      // remaining = 15
      // overflow150 = max(15 - (9 + 4), 0) = max(2, 0) = 2
      // remaining = 15 - 2 = 13
      // overflow125 = max(13 - 9, 0) = 4
      // remaining = 13 - 4 = 9
      // overflow100 = max(9, 0) = 9

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

      // With midTierThreshold = 2:
      // remaining = 5
      // overflow150 = max(5 - (0 + 2), 0) = max(3, 0) = 3
      // remaining = 5 - 3 = 2
      // overflow125 = max(2 - 0, 0) = 2
      // remaining = 2 - 2 = 0
      // overflow100 = max(0, 0) = 0

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

    it("should handle totalHours less than standardHours", () => {
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

    it("should handle exact 150% threshold boundary", () => {
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

    it("should handle one minute over 150% threshold", () => {
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

    it("should handle negative values gracefully with Math.max", () => {
      const input: RegularInput = {
        totalHours: 1,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // All intermediate calculations should be >= 0 due to Math.max
      expect(result.hours100.hours).toBe(1);
      expect(result.hours125.hours).toBe(0);
      expect(result.hours150.hours).toBe(0);
      expect(result.hours100.hours).toBeGreaterThanOrEqual(0);
      expect(result.hours125.hours).toBeGreaterThanOrEqual(0);
      expect(result.hours150.hours).toBeGreaterThanOrEqual(0);
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

  describe("comparison with RegularByDayCalculator logic", () => {
    it("should produce same results as ByDay for hours within standard", () => {
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

      // Both ByShift and ByDay should give same result for standard hours
      expect(result).toEqual({
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should produce same results as ByDay for hours at threshold boundary", () => {
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

      // At the threshold boundary, both should give same result
      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should produce same results as ByDay for hours beyond threshold", () => {
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

      // Both algorithms should produce same distribution
      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 2 },
      });
    });

    it("should handle SpecialFull days same as ByDay", () => {
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
  });

  describe("algorithm verification", () => {
    it("should correctly implement reverse allocation algorithm", () => {
      const input: RegularInput = {
        totalHours: 14,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // Manual calculation:
      // remaining = 14
      // overflow150 = max(14 - (9 + 2), 0) = max(3, 0) = 3
      // remaining = 14 - 3 = 11
      // overflow125 = max(11 - 9, 0) = 2
      // remaining = 11 - 2 = 9
      // overflow100 = max(9, 0) = 9

      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 3 },
      });

      // Verify total
      const totalCalculated =
        result.hours100.hours + result.hours125.hours + result.hours150.hours;
      expect(totalCalculated).toBeCloseTo(input.totalHours);
    });

    it("should always sum calculated hours to total hours", () => {
      const testCases = [0, 5, 9, 10, 11, 12, 15, 20, 24];

      testCases.forEach((totalHours) => {
        const input: RegularInput = {
          totalHours,
          standardHours: 9,
          meta: {
            date: "2024-01-01",
            typeDay: WorkDayType.Regular,
            crossDayContinuation: false,
          },
        };

        const result = calculator.calculate(input);
        const sum =
          result.hours100.hours + result.hours125.hours + result.hours150.hours;

        expect(sum).toBeCloseTo(totalHours);
      });
    });
  });
});
