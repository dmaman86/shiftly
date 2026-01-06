import { describe, it, expect, beforeEach } from "vitest";
import { SpecialCalculator } from "@/domain/calculator/special/special.calculator";
import type { SpecialBreakdown } from "@/domain/types/data-shapes";
import type { LabeledSegmentRange } from "@/domain/types/types";

describe("SpecialCalculator", () => {
  let calculator: SpecialCalculator;

  beforeEach(() => {
    calculator = new SpecialCalculator();
  });

  describe("createEmpty", () => {
    it("should create an empty SpecialBreakdown with zero hours", () => {
      const result = calculator.createEmpty();

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 0 },
      });
    });

    it("should create independent empty objects on each call", () => {
      const result1 = calculator.createEmpty();
      const result2 = calculator.createEmpty();

      result1.shabbat150.hours = 5;

      expect(result1.shabbat150.hours).toBe(5);
      expect(result2.shabbat150.hours).toBe(0);
    });

    it("should use correct percentages from fieldShiftPercent", () => {
      const result = calculator.createEmpty();

      expect(result.shabbat150.percent).toBe(1.5);
      expect(result.shabbat200.percent).toBe(2);
    });
  });

  describe("calculate", () => {
    it("should calculate hours from empty labeled segments", () => {
      const segments: LabeledSegmentRange[] = [];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 0 },
      });
    });

    it("should calculate shabbat150 hours from single time segment at 150% rate", () => {
      // Time segment from minute 0 to minute 60 (1 hour) at 150% rate
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 60 }, // Segment: minutes 0-60 = 1 hour
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 1 },
        shabbat200: { percent: 2, hours: 0 },
      });
    });

    it("should calculate shabbat200 hours from single time segment at 200% rate", () => {
      // Time segment from minute 0 to minute 120 (2 hours) at 200% rate
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 0, end: 120 }, // Segment: minutes 0-120 = 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 2 },
      });
    });

    it("should calculate hours from multiple time segments of same type (both 150%)", () => {
      // Two separate time segments at 150% rate
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 60 }, // Segment 1: minutes 0-60 = 1 hour
        },
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 120, end: 240 }, // Segment 2: minutes 120-240 = 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 3 }, // Total: 1 + 2 = 3 hours
        shabbat200: { percent: 2, hours: 0 },
      });
    });

    it("should calculate hours from multiple time segments of different types (150% and 200%)", () => {
      // Three time segments: two at 150%, one at 200%
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 60 }, // Segment at 150%: minutes 0-60 = 1 hour
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 60, end: 180 }, // Segment at 200%: minutes 60-180 = 2 hours
        },
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 180, end: 300 }, // Segment at 150%: minutes 180-300 = 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 3 }, // 1 + 2 = 3 hours at 150%
        shabbat200: { percent: 2, hours: 2 }, // 2 hours at 200%
      });
    });

    it("should handle decimal hours from time segments with partial minutes", () => {
      // Time segments with durations that aren't whole hours
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 30 }, // Segment: minutes 0-30 = 0.5 hours
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 30, end: 75 }, // Segment: minutes 30-75 = 0.75 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBeCloseTo(0.5);
      expect(result.shabbat200.hours).toBeCloseTo(0.75);
    });

    it("should ignore time segments with keys other than shabbat150 or shabbat200", () => {
      // Mix of Shabbat segments (150%, 200%) and regular segments (ignored)
      // This simulates what ShiftSegmentResolver would return for a shift on a SpecialPartialStart day
      // For example, a shift from 08:00-23:00 on Friday (specialStart at 18:00/1080 minutes):
      // 08:00-14:00 (480-840): hours100
      // 14:00-18:00 (840-1080): hours20  
      // 18:00-22:00 (1080-1320): shabbat150
      // 22:00-23:00 (1320-1380): shabbat200
      const segments: LabeledSegmentRange[] = [
        {
          key: "hours100", // Morning segment - ignored by SpecialCalculator
          percent: 1.0,
          point: { start: 480, end: 840 }, // 08:00-14:00 = 6 hours
        },
        {
          key: "hours20", // Evening segment before Shabbat - ignored
          percent: 0.2,
          point: { start: 840, end: 1080 }, // 14:00-18:00 = 4 hours
        },
        {
          key: "shabbat150", // Shabbat entry - counted
          percent: 1.5,
          point: { start: 1080, end: 1320 }, // 18:00-22:00 = 4 hours
        },
        {
          key: "shabbat200", // Late Shabbat - counted
          percent: 2,
          point: { start: 1320, end: 1380 }, // 22:00-23:00 = 1 hour
        },
      ];

      const result = calculator.calculate(segments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 4 }, // Only shabbat150 counted
        shabbat200: { percent: 2, hours: 1 }, // Only shabbat200 counted
      });
    });

    it("should handle time segments with non-zero start times", () => {
      // Time segment doesn't start at minute 0
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 100, end: 160 }, // Segment: minutes 100-160 = 1 hour
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBe(1);
    });

    it("should handle overlapping time ranges correctly (sum independently)", () => {
      // Note: In practice, segments shouldn't overlap, but calculator sums independently
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 120 }, // Segment: minutes 0-120 = 2 hours
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 60, end: 180 }, // Segment: minutes 60-180 = 2 hours (overlaps previous)
        },
      ];

      const result = calculator.calculate(segments);

      // Both are calculated independently, overlaps don't matter
      expect(result.shabbat150.hours).toBe(2);
      expect(result.shabbat200.hours).toBe(2);
    });

    it("should handle zero-duration time segments", () => {
      // Segment where start equals end (no duration)
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 60, end: 60 }, // Segment: 0 minutes
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 120, end: 240 }, // Segment: 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBe(0);
      expect(result.shabbat200.hours).toBe(2);
    });

    it("should handle large time values (full Shabbat day segment)", () => {
      // Single segment covering 24 hours at 200% rate
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 0, end: 1440 }, // Segment: minutes 0-1440 = 24 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat200.hours).toBe(24);
    });

    it("should handle very precise decimal calculations from small segments", () => {
      // Very small time segments
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 7 }, // Segment: 7 minutes
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 7, end: 23 }, // Segment: 16 minutes
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBeCloseTo(7 / 60);
      expect(result.shabbat200.hours).toBeCloseTo(16 / 60);
    });

    it("should calculate correctly with many time segments", () => {
      const segments: LabeledSegmentRange[] = [];
      
      // Add 10 time segments of 30 minutes each at 150% rate
      for (let i = 0; i < 10; i++) {
        segments.push({
          key: "shabbat150",
          percent: 1.5,
          point: { start: i * 30, end: (i + 1) * 30 }, // Each segment: 30 minutes
        });
      }

      // Add 5 time segments of 60 minutes each at 200% rate
      for (let i = 0; i < 5; i++) {
        segments.push({
          key: "shabbat200",
          percent: 2,
          point: { start: 300 + i * 60, end: 300 + (i + 1) * 60 }, // Each segment: 60 minutes
        });
      }

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBeCloseTo(5); // 10 segments * 30 minutes = 5 hours
      expect(result.shabbat200.hours).toBeCloseTo(5); // 5 segments * 60 minutes = 5 hours
    });

    it("should handle Shabbat time segments according to ShiftSegmentResolver rules", () => {
      // Real Shabbat scenario based on ShiftSegmentResolver:
      // SpecialFull day (Saturday):
      // - 00:00-06:00 (0-360): shabbat200 (200%)
      // - 06:00-22:00 (360-1320): shabbat150 (150%)  
      // - 22:00-24:00 (1320-1440): shabbat200 (200%)
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat200", // Saturday night/early morning at 200%
          percent: 2,
          point: { start: 0, end: 360 }, // Segment: minutes 0-360 (00:00-06:00) = 6 hours
        },
        {
          key: "shabbat150", // Saturday daytime at 150%
          percent: 1.5,
          point: { start: 360, end: 1320 }, // Segment: minutes 360-1320 (06:00-22:00) = 16 hours
        },
        {
          key: "shabbat200", // Saturday late night at 200%
          percent: 2,
          point: { start: 1320, end: 1440 }, // Segment: minutes 1320-1440 (22:00-24:00) = 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBe(16); // 16 hours at 150%
      expect(result.shabbat200.hours).toBe(8); // 6 + 2 = 8 hours at 200%
    });
  });

  describe("accumulate", () => {
    it("should accumulate hours across both types", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 2 },
      };
      const add: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 1 },
        shabbat200: { percent: 2, hours: 3 },
      };

      const result = calculator.accumulate(base, add);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 4 },
        shabbat200: { percent: 2, hours: 5 },
      });
    });

    it("should preserve base percentages", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 2 },
      };
      const add: SpecialBreakdown = {
        shabbat150: { percent: 1.6, hours: 1 }, // Different percent (shouldn't affect result)
        shabbat200: { percent: 2.5, hours: 3 }, // Different percent (shouldn't affect result)
      };

      const result = calculator.accumulate(base, add);

      expect(result.shabbat150.percent).toBe(1.5);
      expect(result.shabbat200.percent).toBe(2);
    });

    it("should handle accumulation with zero hours", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 2 },
      };
      const add = calculator.createEmpty();

      const result = calculator.accumulate(base, add);

      expect(result).toEqual(base);
    });

    it("should handle accumulation to empty base", () => {
      const base = calculator.createEmpty();
      const add: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 2 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.shabbat150.hours).toBe(3);
      expect(result.shabbat200.hours).toBe(2);
    });

    it("should handle decimal hours accumulation", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 1.5 },
        shabbat200: { percent: 2, hours: 2.25 },
      };
      const add: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 0.5 },
        shabbat200: { percent: 2, hours: 0.75 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.shabbat150.hours).toBeCloseTo(2);
      expect(result.shabbat200.hours).toBeCloseTo(3);
    });

    it("should not mutate the original objects", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 2 },
      };
      const add: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 1 },
        shabbat200: { percent: 2, hours: 3 },
      };

      const baseCopy = JSON.parse(JSON.stringify(base));
      const addCopy = JSON.parse(JSON.stringify(add));

      calculator.accumulate(base, add);

      expect(base).toEqual(baseCopy);
      expect(add).toEqual(addCopy);
    });

    it("should handle accumulation across multiple Shabbat days", () => {
      const shabbat1: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 14 },
        shabbat200: { percent: 2, hours: 10 },
      };
      const shabbat2: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 14 },
        shabbat200: { percent: 2, hours: 10 },
      };
      const shabbat3: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 14 },
        shabbat200: { percent: 2, hours: 10 },
      };

      const result1 = calculator.accumulate(shabbat1, shabbat2);
      const result2 = calculator.accumulate(result1, shabbat3);

      expect(result2).toEqual({
        shabbat150: { percent: 1.5, hours: 42 },
        shabbat200: { percent: 2, hours: 30 },
      });
    });
  });

  describe("subtract", () => {
    it("should subtract hours across both types", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 2 },
        shabbat200: { percent: 2, hours: 1 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 3 },
      });
    });

    it("should not allow negative hours (clamp to zero)", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 2 },
        shabbat200: { percent: 2, hours: 1 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 3 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 0 },
      });
    });

    it("should preserve base percentages", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.6, hours: 2 },
        shabbat200: { percent: 2.5, hours: 1 },
      };

      const result = calculator.subtract(base, sub);

      expect(result.shabbat150.percent).toBe(1.5);
      expect(result.shabbat200.percent).toBe(2);
    });

    it("should handle subtraction with zero hours", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };
      const sub = calculator.createEmpty();

      const result = calculator.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle subtraction from empty base", () => {
      const base = calculator.createEmpty();
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle decimal hours subtraction", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5.5 },
        shabbat200: { percent: 2, hours: 3.75 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 2.5 },
        shabbat200: { percent: 2, hours: 1.5 },
      };

      const result = calculator.subtract(base, sub);

      expect(result.shabbat150.hours).toBeCloseTo(3);
      expect(result.shabbat200.hours).toBeCloseTo(2.25);
    });

    it("should handle partial negative results (mixed zero and positive)", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 1 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 2 },
        shabbat200: { percent: 2, hours: 5 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 3 },
        shabbat200: { percent: 2, hours: 0 },
      });
    });

    it("should not mutate the original objects", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 2 },
        shabbat200: { percent: 2, hours: 1 },
      };

      const baseCopy = JSON.parse(JSON.stringify(base));
      const subCopy = JSON.parse(JSON.stringify(sub));

      calculator.subtract(base, sub);

      expect(base).toEqual(baseCopy);
      expect(sub).toEqual(subCopy);
    });

    it("should handle exact subtraction to zero", () => {
      const base: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };
      const sub: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 5 },
        shabbat200: { percent: 2, hours: 4 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 0 },
      });
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow: calculate, accumulate, subtract", () => {
      // First shift with time segments
      const segments1: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 120 }, // Segment: 2 hours at 150%
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 120, end: 180 }, // Segment: 1 hour at 200%
        },
      ];

      // Second shift with time segments
      const segments2: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 60 }, // Segment: 1 hour at 150%
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 60, end: 240 }, // Segment: 3 hours at 200%
        },
      ];

      const breakdown1 = calculator.calculate(segments1);
      const breakdown2 = calculator.calculate(segments2);
      const accumulated = calculator.accumulate(breakdown1, breakdown2);

      expect(accumulated).toEqual({
        shabbat150: { percent: 1.5, hours: 3 }, // 2 + 1 = 3 hours
        shabbat200: { percent: 2, hours: 4 }, // 1 + 3 = 4 hours
      });

      const subtracted = calculator.subtract(accumulated, breakdown1);
      expect(subtracted).toEqual(breakdown2);
    });

    it("should handle accumulation from createEmpty", () => {
      const empty = calculator.createEmpty();
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 60 }, // Segment: 1 hour at 150%
        },
      ];

      const breakdown = calculator.calculate(segments);
      const result = calculator.accumulate(empty, breakdown);

      expect(result).toEqual(breakdown);
    });

    it("should handle full Shabbat day calculation with segments from ShiftSegmentResolver", () => {
      // Friday evening entry (SpecialPartialStart)
      // According to resolver: specialStart (17:00 or 18:00) to 22:00 is shabbat150
      // For this example, using 18:00 start (1080 minutes)
      const fridayEvening: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 1080, end: 1320 }, // Segment: minutes 1080-1320 (18:00-22:00) = 4 hours
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 1320, end: 1440 }, // Segment: minutes 1320-1440 (22:00-24:00) = 2 hours
        },
      ];

      // Saturday full day (SpecialFull)
      // 00:00-06:00: shabbat200, 06:00-22:00: shabbat150, 22:00-24:00: shabbat200
      const saturdayDay: LabeledSegmentRange[] = [
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 0, end: 360 }, // Segment: minutes 0-360 (00:00-06:00) = 6 hours
        },
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 360, end: 1320 }, // Segment: minutes 360-1320 (06:00-22:00) = 16 hours
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 1320, end: 1440 }, // Segment: minutes 1320-1440 (22:00-24:00) = 2 hours
        },
      ];

      const friday = calculator.calculate(fridayEvening);
      const saturday = calculator.calculate(saturdayDay);

      const fullShabbat = calculator.accumulate(friday, saturday);

      expect(fullShabbat).toEqual({
        shabbat150: { percent: 1.5, hours: 20 }, // Friday: 4 + Saturday: 16 = 20 hours at 150%
        shabbat200: { percent: 2, hours: 10 }, // Friday: 2 + Saturday: 6 + 2 = 10 hours at 200%
      });
    });

    it("should handle complex segment filtering (only counts shabbat segments)", () => {
      // Mix of different segment types - only shabbat150 and shabbat200 should be counted
      // This simulates a realistic shift crossing from Friday evening into Saturday
      // For example: 16:00 Friday - 01:00 Saturday on a SpecialPartialStart day
      // Using specialStart at 18:00 (1080 minutes)
      const mixedSegments: LabeledSegmentRange[] = [
        { key: "hours100", percent: 1.0, point: { start: 960, end: 1016 } }, // 16:00-16:56 (ignored)
        { key: "hours20", percent: 0.2, point: { start: 960, end: 1080 } }, // 16:00-18:00 overlapping (ignored)
        { key: "shabbat150", percent: 1.5, point: { start: 1080, end: 1320 } }, // 18:00-22:00 = 4 hours (counted)
        { key: "shabbat200", percent: 2, point: { start: 1320, end: 1500 } }, // 22:00-01:00 next day = 3 hours (counted)
      ];

      const result = calculator.calculate(mixedSegments);

      expect(result).toEqual({
        shabbat150: { percent: 1.5, hours: 4 }, // 4 hours at 150%
        shabbat200: { percent: 2, hours: 3 }, // 3 hours at 200%
      });
    });

    it("should handle monthly accumulation of Shabbat hours from weekly segments", () => {
      // Each Shabbat (SpecialFull day) according to ShiftSegmentResolver:
      // 00:00-06:00 (6h) at 200%, 06:00-22:00 (16h) at 150%, 22:00-24:00 (2h) at 200%
      // Total per Shabbat: 16h at 150%, 8h at 200%
      
      // Week 1 Shabbat
      const shabbatWeek1 = calculator.calculate([
        { key: "shabbat200", percent: 2, point: { start: 0, end: 360 } }, // 6 hours
        { key: "shabbat150", percent: 1.5, point: { start: 360, end: 1320 } }, // 16 hours
        { key: "shabbat200", percent: 2, point: { start: 1320, end: 1440 } }, // 2 hours
      ]);

      // Week 2 Shabbat
      const shabbatWeek2 = calculator.calculate([
        { key: "shabbat200", percent: 2, point: { start: 0, end: 360 } }, // 6 hours
        { key: "shabbat150", percent: 1.5, point: { start: 360, end: 1320 } }, // 16 hours
        { key: "shabbat200", percent: 2, point: { start: 1320, end: 1440 } }, // 2 hours
      ]);

      // Week 3 Shabbat
      const shabbatWeek3 = calculator.calculate([
        { key: "shabbat200", percent: 2, point: { start: 0, end: 360 } }, // 6 hours
        { key: "shabbat150", percent: 1.5, point: { start: 360, end: 1320 } }, // 16 hours
        { key: "shabbat200", percent: 2, point: { start: 1320, end: 1440 } }, // 2 hours
      ]);

      // Week 4 Shabbat
      const shabbatWeek4 = calculator.calculate([
        { key: "shabbat200", percent: 2, point: { start: 0, end: 360 } }, // 6 hours
        { key: "shabbat150", percent: 1.5, point: { start: 360, end: 1320 } }, // 16 hours
        { key: "shabbat200", percent: 2, point: { start: 1320, end: 1440 } }, // 2 hours
      ]);

      const monthTotal = [shabbatWeek1, shabbatWeek2, shabbatWeek3, shabbatWeek4]
        .reduce((acc, week) => calculator.accumulate(acc, week), calculator.createEmpty());

      expect(monthTotal).toEqual({
        shabbat150: { percent: 1.5, hours: 64 }, // 4 weeks * 16 hours = 64 hours
        shabbat200: { percent: 2, hours: 32 }, // 4 weeks * 8 hours = 32 hours
      });
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle very large time values (extended time segments)", () => {
      // Very long time segment (1440 hours = 60 days)
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 86400 }, // Segment: 86400 minutes = 1440 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBe(1440);
    });

    it("should handle time segments with same start and end (zero duration)", () => {
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 100, end: 100 }, // Segment: 0 minutes
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBe(0);
    });

    it("should handle very precise floating point calculations from tiny segments", () => {
      // Very small time segment (just 1 minute)
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 1 }, // Segment: 1 minute
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBeCloseTo(1 / 60, 10);
    });

    it("should maintain precision through multiple operations", () => {
      const breakdown1: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 0.333333 },
        shabbat200: { percent: 2, hours: 0.666666 },
      };
      const breakdown2: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 0.333333 },
        shabbat200: { percent: 2, hours: 0.333334 },
      };

      const accumulated = calculator.accumulate(breakdown1, breakdown2);
      const subtracted = calculator.subtract(accumulated, breakdown1);

      expect(subtracted.shabbat150.hours).toBeCloseTo(breakdown2.shabbat150.hours);
      expect(subtracted.shabbat200.hours).toBeCloseTo(breakdown2.shabbat200.hours);
    });

    it("should handle midnight crossing time segments", () => {
      // Segments that cross midnight boundary (from late night to early morning)
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 1320, end: 1440 }, // Segment: minutes 1320-1440 (22:00-24:00 Friday) = 2 hours
        },
        {
          key: "shabbat200",
          percent: 2,
          point: { start: 0, end: 120 }, // Segment: minutes 0-120 (00:00-02:00 Saturday) = 2 hours
        },
      ];

      const result = calculator.calculate(segments);

      expect(result.shabbat150.hours).toBe(2);
      expect(result.shabbat200.hours).toBe(2);
    });
  });

  describe("fieldShiftPercent consistency", () => {
    it("should use consistent percentages throughout all methods", () => {
      const empty = calculator.createEmpty();
      const segments: LabeledSegmentRange[] = [
        {
          key: "shabbat150",
          percent: 1.5,
          point: { start: 0, end: 60 },
        },
      ];
      const calculated = calculator.calculate(segments);

      expect(empty.shabbat150.percent).toBe(1.5);
      expect(empty.shabbat200.percent).toBe(2);
      expect(calculated.shabbat150.percent).toBe(1.5);
      expect(calculated.shabbat200.percent).toBe(2);
    });

    it("should preserve percentages through operations chain", () => {
      const breakdown1: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 1 },
        shabbat200: { percent: 2, hours: 1 },
      };
      const breakdown2: SpecialBreakdown = {
        shabbat150: { percent: 1.5, hours: 2 },
        shabbat200: { percent: 2, hours: 2 },
      };

      const accumulated = calculator.accumulate(breakdown1, breakdown2);
      const subtracted = calculator.subtract(accumulated, breakdown1);

      expect(accumulated.shabbat150.percent).toBe(1.5);
      expect(accumulated.shabbat200.percent).toBe(2);
      expect(subtracted.shabbat150.percent).toBe(1.5);
      expect(subtracted.shabbat200.percent).toBe(2);
    });
  });
});
