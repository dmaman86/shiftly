import { describe, it, expect, beforeEach } from "vitest";
import { FixedSegmentCalculator } from "@/domain/calculator/fixed-segment.calculator";
import type { Segment } from "@/domain/types/data-shapes";

describe("FixedSegmentCalculator", () => {
  let calculator: FixedSegmentCalculator;

  beforeEach(() => {
    calculator = new FixedSegmentCalculator();
  });

  describe("constructor", () => {
    it("should create a new instance", () => {
      expect(calculator).toBeInstanceOf(FixedSegmentCalculator);
    });

    it("should create independent instances", () => {
      const calculator1 = new FixedSegmentCalculator();
      const calculator2 = new FixedSegmentCalculator();

      expect(calculator1).not.toBe(calculator2);
    });

    it("should have calculate method defined", () => {
      expect(calculator.calculate).toBeDefined();
      expect(typeof calculator.calculate).toBe("function");
    });
  });

  describe("calculate", () => {
    it("should create a segment with 100% rate for positive hours", () => {
      const result = calculator.calculate(8);

      expect(result).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for zero hours", () => {
      const result = calculator.calculate(0);

      expect(result).toEqual({
        percent: 1,
        hours: 0,
      });
    });

    it("should create a segment for decimal hours", () => {
      const result = calculator.calculate(8.5);

      expect(result).toEqual({
        percent: 1,
        hours: 8.5,
      });
    });

    it("should create a segment for fractional hours", () => {
      const result = calculator.calculate(7.75);

      expect(result).toEqual({
        percent: 1,
        hours: 7.75,
      });
    });

    it("should create a segment for very small hours", () => {
      const result = calculator.calculate(0.25);

      expect(result).toEqual({
        percent: 1,
        hours: 0.25,
      });
    });

    it("should create a segment for large hours", () => {
      const result = calculator.calculate(24);

      expect(result).toEqual({
        percent: 1,
        hours: 24,
      });
    });

    it("should create a segment for very large hours", () => {
      const result = calculator.calculate(100);

      expect(result).toEqual({
        percent: 1,
        hours: 100,
      });
    });

    it("should always use 100% rate (percent = 1)", () => {
      const testCases = [0, 1, 5, 8, 10, 15, 24];

      testCases.forEach((hours) => {
        const result = calculator.calculate(hours);
        expect(result.percent).toBe(1);
      });
    });

    it("should preserve exact hours value passed", () => {
      const testCases = [0, 0.5, 1, 8, 8.5, 10.25, 24];

      testCases.forEach((hours) => {
        const result = calculator.calculate(hours);
        expect(result.hours).toBe(hours);
      });
    });

    it("should handle negative hours (if provided)", () => {
      const result = calculator.calculate(-5);

      expect(result).toEqual({
        percent: 1,
        hours: -5,
      });
    });

    it("should return a properly typed Segment", () => {
      const result: Segment = calculator.calculate(8);

      expect(result).toHaveProperty("percent");
      expect(result).toHaveProperty("hours");
      expect(typeof result.percent).toBe("number");
      expect(typeof result.hours).toBe("number");
    });
  });

  describe("immutability", () => {
    it("should create new segment objects on each call", () => {
      const segment1 = calculator.calculate(8);
      const segment2 = calculator.calculate(8);

      expect(segment1).toEqual(segment2);
      expect(segment1).not.toBe(segment2);
    });

    it("should not be affected by modifications to returned segments", () => {
      const segment1 = calculator.calculate(8);
      segment1.hours = 10; // Modify returned segment
      segment1.percent = 2;

      const segment2 = calculator.calculate(8);

      expect(segment2).toEqual({
        percent: 1,
        hours: 8,
      });
    });
  });

  describe("use cases - sick leave", () => {
    it("should create a segment for full sick day (8 hours)", () => {
      const sickHours = 8;
      const segment = calculator.calculate(sickHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for half sick day (4 hours)", () => {
      const sickHours = 4;
      const segment = calculator.calculate(sickHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 4,
      });
    });

    it("should create a segment for partial sick hours", () => {
      const sickHours = 2.5;
      const segment = calculator.calculate(sickHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 2.5,
      });
    });
  });

  describe("use cases - vacation", () => {
    it("should create a segment for full vacation day (8 hours)", () => {
      const vacationHours = 8;
      const segment = calculator.calculate(vacationHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for extended vacation day (9 hours)", () => {
      const vacationHours = 9;
      const segment = calculator.calculate(vacationHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 9,
      });
    });

    it("should create a segment for partial vacation hours", () => {
      const vacationHours = 6.5;
      const segment = calculator.calculate(vacationHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 6.5,
      });
    });
  });

  describe("use cases - extra Shabbat", () => {
    it("should create a segment for extra Shabbat hours", () => {
      const earnedShabbatCreditHours = 8;
      const segment = calculator.calculate(earnedShabbatCreditHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for partial extra Shabbat hours", () => {
      const earnedShabbatCreditHours = 4;
      const segment = calculator.calculate(earnedShabbatCreditHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 4,
      });
    });
  });

  describe("batch creation", () => {
    it("should create multiple segments independently", () => {
      const hours = [8, 4, 6, 9, 7.5];
      const segments = hours.map((h) => calculator.calculate(h));

      expect(segments).toHaveLength(5);
      segments.forEach((segment, index) => {
        expect(segment.percent).toBe(1);
        expect(segment.hours).toBe(hours[index]);
      });
    });

    it("should handle creating many segments", () => {
      const segments = Array.from({ length: 30 }, () => calculator.calculate(8));

      expect(segments).toHaveLength(30);
      segments.forEach((segment) => {
        expect(segment).toEqual({
          percent: 1,
          hours: 8,
        });
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very precise decimal hours", () => {
      const result = calculator.calculate(8.333333333);

      expect(result.percent).toBe(1);
      expect(result.hours).toBe(8.333333333);
    });

    it("should handle hours close to zero", () => {
      const result = calculator.calculate(0.01);

      expect(result).toEqual({
        percent: 1,
        hours: 0.01,
      });
    });

    it("should handle floating point arithmetic", () => {
      const result = calculator.calculate(0.1 + 0.2); // JavaScript floating point

      expect(result.percent).toBe(1);
      expect(result.hours).toBeCloseTo(0.3);
    });

    it("should handle maximum safe integer", () => {
      const result = calculator.calculate(Number.MAX_SAFE_INTEGER);

      expect(result.percent).toBe(1);
      expect(result.hours).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle minimum positive value", () => {
      const result = calculator.calculate(Number.MIN_VALUE);

      expect(result.percent).toBe(1);
      expect(result.hours).toBe(Number.MIN_VALUE);
    });
  });

  describe("consistency", () => {
    it("should always produce the same output for the same input", () => {
      const hours = 8.5;
      const results = Array.from({ length: 10 }, () => calculator.calculate(hours));

      results.forEach((result) => {
        expect(result).toEqual({
          percent: 1,
          hours: 8.5,
        });
      });
    });

    it("should produce consistent results across multiple instances", () => {
      const calculator1 = new FixedSegmentCalculator();
      const calculator2 = new FixedSegmentCalculator();
      const calculator3 = new FixedSegmentCalculator();

      const result1 = calculator1.calculate(8);
      const result2 = calculator2.calculate(8);
      const result3 = calculator3.calculate(8);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe("integration - typical workflow", () => {
    it("should work in a sick day scenario", () => {
      const calculator = new FixedSegmentCalculator();
      
      // Worker took sick leave for 8 hours
      const sickSegment = calculator.calculate(8);

      expect(sickSegment.percent).toBe(1);
      expect(sickSegment.hours).toBe(8);
    });

    it("should work in a vacation scenario", () => {
      const calculator = new FixedSegmentCalculator();
      
      // Worker took vacation for 9 hours (standard hours)
      const vacationSegment = calculator.calculate(9);

      expect(vacationSegment.percent).toBe(1);
      expect(vacationSegment.hours).toBe(9);
    });

    it("should work for multiple fixed segments in a month", () => {
      const calculator = new FixedSegmentCalculator();
      
      // Multiple days with fixed hours
      const day1Sick = calculator.calculate(8);
      const day2Vacation = calculator.calculate(9);
      const day3Sick = calculator.calculate(4);

      const totalHours = day1Sick.hours + day2Vacation.hours + day3Sick.hours;

      expect(totalHours).toBe(21);
      expect(day1Sick.percent).toBe(1);
      expect(day2Vacation.percent).toBe(1);
      expect(day3Sick.percent).toBe(1);
    });

    it("should integrate with breakdown calculations", () => {
      const calculator = new FixedSegmentCalculator();
      
      // Simulate adding fixed hours to a breakdown
      const sickSegment = calculator.calculate(8);

      const breakdown = {
        hours100: sickSegment,
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      };

      expect(breakdown.hours100).toEqual({
        percent: 1,
        hours: 8,
      });
    });
  });

  describe("calculator method signature", () => {
    it("should accept number parameter", () => {
      expect(() => calculator.calculate(8)).not.toThrow();
    });

    it("should return Segment type", () => {
      const result = calculator.calculate(8);
      
      expect(result).toHaveProperty("percent");
      expect(result).toHaveProperty("hours");
    });
  });
});
