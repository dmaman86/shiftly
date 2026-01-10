import { describe, it, expect, beforeEach } from "vitest";
import { ExtraCalculator } from "@/domain/calculator/extra/extra.calculator";
import type { ExtraBreakdown } from "@/domain/types/data-shapes";
import type { LabeledSegmentRange } from "@/domain/types/types";

describe("ExtraCalculator", () => {
  let calculator: ExtraCalculator;

  beforeEach(() => {
    calculator = new ExtraCalculator();
  });

  describe("createEmpty", () => {
    it("should create an empty ExtraBreakdown with zero hours", () => {
      const result = calculator.createEmpty();

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });

    it("should create independent empty objects on each call", () => {
      const result1 = calculator.createEmpty();
      const result2 = calculator.createEmpty();

      result1.hours20.hours = 5;

      expect(result1.hours20.hours).toBe(5);
      expect(result2.hours20.hours).toBe(0);
    });
  });

  describe("calculate", () => {
    it("should calculate hours from empty labeled segments", () => {
      const segments: LabeledSegmentRange[] = [];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });

    it("should calculate hours20 from single segment", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 }, // 60 minutes = 1 hour
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 1 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });

    it("should calculate hours50 from single segment", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 0, end: 120 }, // 120 minutes = 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 2 },
      });
    });

    it("should calculate hours from multiple segments of same type", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 }, // 1 hour
        },
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 120, end: 240 }, // 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });

    it("should calculate hours from multiple segments of different types", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 }, // 1 hour
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 60, end: 180 }, // 2 hours
        },
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 180, end: 300 }, // 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 2 },
      });
    });

    it("should handle decimal hours from minutes", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 30 }, // 30 minutes = 0.5 hours
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 30, end: 75 }, // 45 minutes = 0.75 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.hours20.hours).toBeCloseTo(0.5);
      expect(result.hours50.hours).toBeCloseTo(0.75);
    });

    it("should ignore segments with keys other than hours20 or hours50", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 },
        },
        {
          key: "hours100", // This should be ignored
          percent: 1.0,
          point: { start: 60, end: 180 },
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 180, end: 300 },
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 1 },
        hours50: { percent: 0.5, hours: 2 },
      });
    });

    it("should handle segments with non-zero start times", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 100, end: 160 }, // 60 minutes = 1 hour
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.hours20.hours).toBe(1);
    });

    it("should handle overlapping time ranges correctly (sum independently)", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 120 }, // 2 hours
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 60, end: 180 }, // 2 hours (overlaps with hours20)
        },
      ];

      const result = calculator.calculate(segments);

      // Both should be calculated independently, overlaps don't matter
      expect(result.hours20.hours).toBe(2);
      expect(result.hours50.hours).toBe(2);
    });

    it("should handle very precise decimal calculations", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 7 }, // 7 minutes
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 7, end: 23 }, // 16 minutes
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.hours20.hours).toBeCloseTo(7 / 60);
      expect(result.hours50.hours).toBeCloseTo(16 / 60);
    });

    it("should calculate correctly with many segments", () => {
      const segments: LabeledSegmentRange[] = [];
      
      // Add 10 hours20 segments of 30 minutes each
      for (let i = 0; i < 10; i++) {
        segments.push({
          key: "hours20",
          percent: 0.2,
          point: { start: i * 30, end: (i + 1) * 30 },
        });
      }

      // Add 5 hours50 segments of 60 minutes each
      for (let i = 0; i < 5; i++) {
        segments.push({
          key: "hours50",
          percent: 0.5,
          point: { start: 300 + i * 60, end: 300 + (i + 1) * 60 },
        });
      }

      const result = calculator.calculate(segments);

      expect(result.hours20.hours).toBeCloseTo(5); // 10 * 30 minutes = 5 hours
      expect(result.hours50.hours).toBeCloseTo(5); // 5 * 60 minutes = 5 hours
    });
  });

  describe("accumulate", () => {
    it("should accumulate hours across both types", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 2 },
      };
      const add: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 1 },
        hours50: { percent: 0.5, hours: 3 },
      };

      const result = calculator.accumulate(base, add);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 4 },
        hours50: { percent: 0.5, hours: 5 },
      });
    });

    it("should handle accumulation with zero hours", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 2 },
      };
      const add = calculator.createEmpty();

      const result = calculator.accumulate(base, add);

      expect(result).toEqual(base);
    });

    it("should handle accumulation to empty base", () => {
      const base = calculator.createEmpty();
      const add: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 2 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.hours20.hours).toBe(3);
      expect(result.hours50.hours).toBe(2);
    });

    it("should handle decimal hours accumulation", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 1.5 },
        hours50: { percent: 0.5, hours: 2.25 },
      };
      const add: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 0.5 },
        hours50: { percent: 0.5, hours: 0.75 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.hours20.hours).toBeCloseTo(2);
      expect(result.hours50.hours).toBeCloseTo(3);
    });

    it("should not mutate the original objects", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 2 },
      };
      const add: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 1 },
        hours50: { percent: 0.5, hours: 3 },
      };

      const baseCopy = JSON.parse(JSON.stringify(base));
      const addCopy = JSON.parse(JSON.stringify(add));

      calculator.accumulate(base, add);

      expect(base).toEqual(baseCopy);
      expect(add).toEqual(addCopy);
    });

    it("should handle multiple accumulations", () => {
      const breakdown1: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 1 },
        hours50: { percent: 0.5, hours: 1 },
      };
      const breakdown2: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2 },
        hours50: { percent: 0.5, hours: 2 },
      };
      const breakdown3: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 3 },
      };

      const result1 = calculator.accumulate(breakdown1, breakdown2);
      const result2 = calculator.accumulate(result1, breakdown3);

      expect(result2).toEqual({
        hours20: { percent: 0.2, hours: 6 },
        hours50: { percent: 0.5, hours: 6 },
      });
    });
  });

  describe("subtract", () => {
    it("should subtract hours across both types", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 4 },
      };
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2 },
        hours50: { percent: 0.5, hours: 1 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 3 },
      });
    });

    it("should not allow negative hours (clamp to zero)", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2 },
        hours50: { percent: 0.5, hours: 1 },
      };
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 3 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });

    it("should handle subtraction with zero hours", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 4 },
      };
      const sub = calculator.createEmpty();

      const result = calculator.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle subtraction from empty base", () => {
      const base = calculator.createEmpty();
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 4 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle decimal hours subtraction", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5.5 },
        hours50: { percent: 0.5, hours: 3.75 },
      };
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2.5 },
        hours50: { percent: 0.5, hours: 1.5 },
      };

      const result = calculator.subtract(base, sub);

      expect(result.hours20.hours).toBeCloseTo(3);
      expect(result.hours50.hours).toBeCloseTo(2.25);
    });

    it("should handle partial negative results (mixed zero and positive)", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 1 },
      };
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2 },
        hours50: { percent: 0.5, hours: 5 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });

    it("should not mutate the original objects", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 4 },
      };
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2 },
        hours50: { percent: 0.5, hours: 1 },
      };

      const baseCopy = JSON.parse(JSON.stringify(base));
      const subCopy = JSON.parse(JSON.stringify(sub));

      calculator.subtract(base, sub);

      expect(base).toEqual(baseCopy);
      expect(sub).toEqual(subCopy);
    });

    it("should handle exact subtraction to zero", () => {
      const base: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 4 },
      };
      const sub: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 5 },
        hours50: { percent: 0.5, hours: 4 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 0 },
      });
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow: calculate, accumulate, subtract", () => {
      const segments1: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 120 }, // 2 hours
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 120, end: 180 }, // 1 hour
        },
      ];

      const segments2: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 }, // 1 hour
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 60, end: 240 }, // 3 hours
        },
      ];

      const breakdown1 = calculator.calculate(segments1);
      const breakdown2 = calculator.calculate(segments2);
      const accumulated = calculator.accumulate(breakdown1, breakdown2);

      expect(accumulated).toEqual({
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 4 },
      });

      const subtracted = calculator.subtract(accumulated, breakdown1);
      expect(subtracted).toEqual(breakdown2);
    });

    it("should handle accumulation from createEmpty", () => {
      const empty = calculator.createEmpty();
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 },
        },
      ];

      const breakdown = calculator.calculate(segments);
      const result = calculator.accumulate(empty, breakdown);

      expect(result).toEqual(breakdown);
    });

    it("should handle multiple shifts throughout a day", () => {
      // Morning shift
      const morningSegments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 120 }, // 2 hours
        },
      ];

      // Afternoon shift
      const afternoonSegments: LabeledSegmentRange[] = [
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 480, end: 600 }, // 2 hours
        },
      ];

      // Night shift
      const nightSegments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 1200, end: 1320 }, // 2 hours
        },
        {
          key: "hours50",
          percent: 0.5,
          point: { start: 1320, end: 1380 }, // 1 hour
        },
      ];

      const morning = calculator.calculate(morningSegments);
      const afternoon = calculator.calculate(afternoonSegments);
      const night = calculator.calculate(nightSegments);

      const dayTotal = calculator.accumulate(
        calculator.accumulate(morning, afternoon),
        night
      );

      expect(dayTotal).toEqual({
        hours20: { percent: 0.2, hours: 4 },
        hours50: { percent: 0.5, hours: 3 },
      });
    });

    it("should handle complex segment filtering", () => {
      const mixedSegments: LabeledSegmentRange[] = [
        { key: "hours20", percent: 0.2, point: { start: 0, end: 60 } },
        { key: "hours100", percent: 1.0, point: { start: 60, end: 120 } }, // Ignored
        { key: "hours50", percent: 0.5, point: { start: 120, end: 240 } },
        { key: "hours125", percent: 1.25, point: { start: 240, end: 300 } }, // Ignored
        { key: "hours20", percent: 0.2, point: { start: 300, end: 420 } },
        { key: "shabbat150", percent: 1.5, point: { start: 420, end: 480 } }, // Ignored
      ];

      const result = calculator.calculate(mixedSegments);

      expect(result).toEqual({
        hours20: { percent: 0.2, hours: 3 },
        hours50: { percent: 0.5, hours: 2 },
      });
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle very large time values", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 86400 }, // 1440 hours (60 days)
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.hours20.hours).toBe(1440);
    });

    it("should handle segments with same start and end", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 100, end: 100 },
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.hours20.hours).toBe(0);
    });

    it("should maintain precision through multiple operations", () => {
      const breakdown1: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 0.333333 },
        hours50: { percent: 0.5, hours: 0.666666 },
      };
      const breakdown2: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 0.333333 },
        hours50: { percent: 0.5, hours: 0.333334 },
      };

      const accumulated = calculator.accumulate(breakdown1, breakdown2);
      const subtracted = calculator.subtract(accumulated, breakdown1);

      expect(subtracted.hours20.hours).toBeCloseTo(breakdown2.hours20.hours);
      expect(subtracted.hours50.hours).toBeCloseTo(breakdown2.hours50.hours);
    });
  });

  describe("fieldShiftPercent consistency", () => {
    it("should use consistent percentages throughout all methods", () => {
      const empty = calculator.createEmpty();
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours20",
          percent: 0.2,
          point: { start: 0, end: 60 },
        },
      ];
      const calculated = calculator.calculate(segments);

      expect(empty.hours20.percent).toBe(0.2);
      expect(empty.hours50.percent).toBe(0.5);
      expect(calculated.hours20.percent).toBe(0.2);
      expect(calculated.hours50.percent).toBe(0.5);
    });

    it("should preserve percentages through operations chain", () => {
      const breakdown1: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 1 },
        hours50: { percent: 0.5, hours: 1 },
      };
      const breakdown2: ExtraBreakdown = {
        hours20: { percent: 0.2, hours: 2 },
        hours50: { percent: 0.5, hours: 2 },
      };

      const accumulated = calculator.accumulate(breakdown1, breakdown2);
      const subtracted = calculator.subtract(accumulated, breakdown1);

      expect(accumulated.hours20.percent).toBe(0.2);
      expect(accumulated.hours50.percent).toBe(0.5);
      expect(subtracted.hours20.percent).toBe(0.2);
      expect(subtracted.hours50.percent).toBe(0.5);
    });
  });
});
