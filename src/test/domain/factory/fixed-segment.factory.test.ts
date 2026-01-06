import { describe, it, expect, beforeEach } from "vitest";
import { FixedSegmentFactory } from "@/domain/factory/fixed-segment.factory";
import type { Segment } from "@/domain/types/data-shapes";

describe("FixedSegmentFactory", () => {
  let factory: FixedSegmentFactory;

  beforeEach(() => {
    factory = new FixedSegmentFactory();
  });

  describe("constructor", () => {
    it("should create a new instance", () => {
      expect(factory).toBeInstanceOf(FixedSegmentFactory);
    });

    it("should create independent instances", () => {
      const factory1 = new FixedSegmentFactory();
      const factory2 = new FixedSegmentFactory();

      expect(factory1).not.toBe(factory2);
    });

    it("should have create method defined", () => {
      expect(factory.create).toBeDefined();
      expect(typeof factory.create).toBe("function");
    });
  });

  describe("create", () => {
    it("should create a segment with 100% rate for positive hours", () => {
      const result = factory.create(8);

      expect(result).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for zero hours", () => {
      const result = factory.create(0);

      expect(result).toEqual({
        percent: 1,
        hours: 0,
      });
    });

    it("should create a segment for decimal hours", () => {
      const result = factory.create(8.5);

      expect(result).toEqual({
        percent: 1,
        hours: 8.5,
      });
    });

    it("should create a segment for fractional hours", () => {
      const result = factory.create(7.75);

      expect(result).toEqual({
        percent: 1,
        hours: 7.75,
      });
    });

    it("should create a segment for very small hours", () => {
      const result = factory.create(0.25);

      expect(result).toEqual({
        percent: 1,
        hours: 0.25,
      });
    });

    it("should create a segment for large hours", () => {
      const result = factory.create(24);

      expect(result).toEqual({
        percent: 1,
        hours: 24,
      });
    });

    it("should create a segment for very large hours", () => {
      const result = factory.create(100);

      expect(result).toEqual({
        percent: 1,
        hours: 100,
      });
    });

    it("should always use 100% rate (percent = 1)", () => {
      const testCases = [0, 1, 5, 8, 10, 15, 24];

      testCases.forEach((hours) => {
        const result = factory.create(hours);
        expect(result.percent).toBe(1);
      });
    });

    it("should preserve exact hours value passed", () => {
      const testCases = [0, 0.5, 1, 8, 8.5, 10.25, 24];

      testCases.forEach((hours) => {
        const result = factory.create(hours);
        expect(result.hours).toBe(hours);
      });
    });

    it("should handle negative hours (if provided)", () => {
      const result = factory.create(-5);

      expect(result).toEqual({
        percent: 1,
        hours: -5,
      });
    });

    it("should return a properly typed Segment", () => {
      const result: Segment = factory.create(8);

      expect(result).toHaveProperty("percent");
      expect(result).toHaveProperty("hours");
      expect(typeof result.percent).toBe("number");
      expect(typeof result.hours).toBe("number");
    });
  });

  describe("immutability", () => {
    it("should create new segment objects on each call", () => {
      const segment1 = factory.create(8);
      const segment2 = factory.create(8);

      expect(segment1).toEqual(segment2);
      expect(segment1).not.toBe(segment2);
    });

    it("should not be affected by modifications to returned segments", () => {
      const segment1 = factory.create(8);
      segment1.hours = 10; // Modify returned segment
      segment1.percent = 2;

      const segment2 = factory.create(8);

      expect(segment2).toEqual({
        percent: 1,
        hours: 8,
      });
    });
  });

  describe("use cases - sick leave", () => {
    it("should create a segment for full sick day (8 hours)", () => {
      const sickHours = 8;
      const segment = factory.create(sickHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for half sick day (4 hours)", () => {
      const sickHours = 4;
      const segment = factory.create(sickHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 4,
      });
    });

    it("should create a segment for partial sick hours", () => {
      const sickHours = 2.5;
      const segment = factory.create(sickHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 2.5,
      });
    });
  });

  describe("use cases - vacation", () => {
    it("should create a segment for full vacation day (8 hours)", () => {
      const vacationHours = 8;
      const segment = factory.create(vacationHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for extended vacation day (9 hours)", () => {
      const vacationHours = 9;
      const segment = factory.create(vacationHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 9,
      });
    });

    it("should create a segment for partial vacation hours", () => {
      const vacationHours = 6.5;
      const segment = factory.create(vacationHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 6.5,
      });
    });
  });

  describe("use cases - extra Shabbat", () => {
    it("should create a segment for extra Shabbat hours", () => {
      const extraShabbatHours = 8;
      const segment = factory.create(extraShabbatHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 8,
      });
    });

    it("should create a segment for partial extra Shabbat hours", () => {
      const extraShabbatHours = 4;
      const segment = factory.create(extraShabbatHours);

      expect(segment).toEqual({
        percent: 1,
        hours: 4,
      });
    });
  });

  describe("batch creation", () => {
    it("should create multiple segments independently", () => {
      const hours = [8, 4, 6, 9, 7.5];
      const segments = hours.map((h) => factory.create(h));

      expect(segments).toHaveLength(5);
      segments.forEach((segment, index) => {
        expect(segment.percent).toBe(1);
        expect(segment.hours).toBe(hours[index]);
      });
    });

    it("should handle creating many segments", () => {
      const segments = Array.from({ length: 30 }, () => factory.create(8));

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
      const result = factory.create(8.333333333);

      expect(result.percent).toBe(1);
      expect(result.hours).toBe(8.333333333);
    });

    it("should handle hours close to zero", () => {
      const result = factory.create(0.01);

      expect(result).toEqual({
        percent: 1,
        hours: 0.01,
      });
    });

    it("should handle floating point arithmetic", () => {
      const result = factory.create(0.1 + 0.2); // JavaScript floating point

      expect(result.percent).toBe(1);
      expect(result.hours).toBeCloseTo(0.3);
    });

    it("should handle maximum safe integer", () => {
      const result = factory.create(Number.MAX_SAFE_INTEGER);

      expect(result.percent).toBe(1);
      expect(result.hours).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle minimum positive value", () => {
      const result = factory.create(Number.MIN_VALUE);

      expect(result.percent).toBe(1);
      expect(result.hours).toBe(Number.MIN_VALUE);
    });
  });

  describe("consistency", () => {
    it("should always produce the same output for the same input", () => {
      const hours = 8.5;
      const results = Array.from({ length: 10 }, () => factory.create(hours));

      results.forEach((result) => {
        expect(result).toEqual({
          percent: 1,
          hours: 8.5,
        });
      });
    });

    it("should produce consistent results across multiple instances", () => {
      const factory1 = new FixedSegmentFactory();
      const factory2 = new FixedSegmentFactory();
      const factory3 = new FixedSegmentFactory();

      const result1 = factory1.create(8);
      const result2 = factory2.create(8);
      const result3 = factory3.create(8);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe("integration - typical workflow", () => {
    it("should work in a sick day scenario", () => {
      const factory = new FixedSegmentFactory();
      
      // Worker took sick leave for 8 hours
      const sickSegment = factory.create(8);

      expect(sickSegment.percent).toBe(1);
      expect(sickSegment.hours).toBe(8);
    });

    it("should work in a vacation scenario", () => {
      const factory = new FixedSegmentFactory();
      
      // Worker took vacation for 9 hours (standard hours)
      const vacationSegment = factory.create(9);

      expect(vacationSegment.percent).toBe(1);
      expect(vacationSegment.hours).toBe(9);
    });

    it("should work for multiple fixed segments in a month", () => {
      const factory = new FixedSegmentFactory();
      
      // Multiple days with fixed hours
      const day1Sick = factory.create(8);
      const day2Vacation = factory.create(9);
      const day3Sick = factory.create(4);

      const totalHours = day1Sick.hours + day2Vacation.hours + day3Sick.hours;

      expect(totalHours).toBe(21);
      expect(day1Sick.percent).toBe(1);
      expect(day2Vacation.percent).toBe(1);
      expect(day3Sick.percent).toBe(1);
    });

    it("should integrate with breakdown calculations", () => {
      const factory = new FixedSegmentFactory();
      
      // Simulate adding fixed hours to a breakdown
      const sickSegment = factory.create(8);

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

  describe("factory method signature", () => {
    it("should accept number parameter", () => {
      expect(() => factory.create(8)).not.toThrow();
    });

    it("should return Segment type", () => {
      const result = factory.create(8);
      
      expect(result).toHaveProperty("percent");
      expect(result).toHaveProperty("hours");
    });
  });
});
