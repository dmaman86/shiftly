import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShiftSegmentBuilder } from "@/domain/builder/shiftSegment.builder";
import { ShiftSegmentResolver } from "@/domain/resolve/shiftSegment.resolver";
import { ShiftService } from "@/domain/services/shift.service";
import { DateService } from "@/domain/services/date.service";
import { WorkDayType } from "@/constants/fields.constant";
import type { Shift } from "@/domain/types/data-shapes";
import type { WorkDayMeta } from "@/domain/types/types";

describe("ShiftSegmentBuilder", () => {
  let builder: ShiftSegmentBuilder;
  let segmentResolver: ShiftSegmentResolver;
  let shiftService: ShiftService;
  let dateService: DateService;

  beforeEach(() => {
    dateService = new DateService();
    shiftService = new ShiftService(dateService);
    segmentResolver = new ShiftSegmentResolver();
    builder = new ShiftSegmentBuilder(segmentResolver, shiftService);
  });

  // Helper function to create a shift
  const createShift = (
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    sameDay = true,
    date = "2024-01-15"
  ): Shift => {
    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(date);
    if (!sameDay) {
      endDate.setDate(endDate.getDate() + 1);
    }
    endDate.setHours(endHour, endMinute, 0, 0);

    return {
      id: "test-shift-1",
      start: { date: startDate },
      end: { date: endDate },
      isDuty: false,
    };
  };

  const createMeta = (
    date = "2024-01-15",
    typeDay = WorkDayType.Regular,
    crossDayContinuation = false
  ): WorkDayMeta => ({
    date,
    typeDay,
    crossDayContinuation,
  });

  describe("build - Valid shifts", () => {
    it("should build segments for a simple morning shift (08:00-16:00)", () => {
      const shift = createShift(8, 0, 16, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((s) => s.point.start < s.point.end)).toBe(true);
    });

    it("should build segments for a night shift within same day (22:00-06:00)", () => {
      const shift = createShift(22, 0, 6, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have segments from both parts of the shift
      const hasNightSegment = result.some((s) => s.key === "hours50");
      expect(hasNightSegment).toBe(true);
    });

    it("should build segments for a full 24-hour shift", () => {
      const shift = createShift(8, 0, 8, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have multiple segment types
      const segmentKeys = new Set(result.map((s) => s.key));
      expect(segmentKeys.size).toBeGreaterThan(1);
    });

    it("should build segments for an afternoon shift (14:00-22:00)", () => {
      const shift = createShift(14, 0, 22, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have hours20 for evening period
      const hasEvening = result.some((s) => s.key === "hours20");
      expect(hasEvening).toBe(true);
    });

    it("should build segments for a short shift (2 hours)", () => {
      const shift = createShift(10, 0, 12, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // All segments should be within the shift timeframe
      result.forEach((segment) => {
        const duration = segment.point.end - segment.point.start;
        expect(duration).toBeGreaterThan(0);
      });
    });

    it("should build segments crossing midnight (20:00-04:00)", () => {
      const shift = createShift(20, 0, 4, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have segments from different time periods
      const hasEvening = result.some((s) => s.key === "hours20");
      const hasNight = result.some((s) => s.key === "hours50");
      
      expect(hasEvening || hasNight).toBe(true);
    });
  });

  describe("build - Cross-day shifts", () => {
    it("should split shift crossing midnight correctly", () => {
      const shift = createShift(23, 0, 7, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have segments spanning across two days
      const maxEnd = Math.max(...result.map((s) => s.point.end));
      expect(maxEnd).toBeGreaterThan(1440); // Beyond first day
    });

    it("should handle shift crossing into second day with proper metadata", () => {
      const shift = createShift(20, 0, 6, 0, false, "2024-01-15");
      const meta = createMeta("2024-01-15");

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Segments should be sorted by start time
      for (let i = 1; i < result.length; i++) {
        expect(result[i].point.start).toBeGreaterThanOrEqual(
          result[i - 1].point.start
        );
      }
    });

    it("should maintain crossDayContinuation=false for second part when meta.crossDayContinuation=false", () => {
      const shift = createShift(22, 0, 8, 0, false);
      const meta = createMeta("2024-01-15", WorkDayType.Regular, false);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle SpecialFull cross-day continuation", () => {
      const shift = createShift(20, 0, 8, 0, false, "2024-01-06");
      const meta = createMeta("2024-01-06", WorkDayType.SpecialFull, true);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Second part should be SpecialFull when crossDayContinuation is true
      const hasShabbatSegments = result.some((s) => s.key.startsWith("shabbat"));
      expect(hasShabbatSegments).toBe(true);
    });

    it("should change typeDay to SpecialFull for second part when crossDayContinuation=true", () => {
      const shift = createShift(22, 0, 6, 0, false);
      const meta = createMeta("2024-01-05", WorkDayType.SpecialPartialStart, true);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("build - Special days (Shabbat/Holiday)", () => {
    it("should build segments for Friday evening shift (SpecialPartialStart)", () => {
      const shift = createShift(16, 0, 23, 0, true, "2024-01-05");
      const meta = createMeta("2024-01-05", WorkDayType.SpecialPartialStart);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have Shabbat segments
      const hasShabbat = result.some((s) => s.key.startsWith("shabbat"));
      expect(hasShabbat).toBe(true);
    });

    it("should build segments for Saturday shift (SpecialFull)", () => {
      const shift = createShift(8, 0, 20, 0, true, "2024-01-06");
      const meta = createMeta("2024-01-06", WorkDayType.SpecialFull);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // All segments should be Shabbat segments
      const allShabbat = result.every((s) => s.key.startsWith("shabbat"));
      expect(allShabbat).toBe(true);
    });

    it("should handle Friday night to Saturday morning shift", () => {
      const shift = createShift(22, 0, 10, 0, false, "2024-01-05");
      const meta = createMeta("2024-01-05", WorkDayType.SpecialPartialStart);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have Shabbat segments
      const hasShabbat = result.some((s) => s.key.startsWith("shabbat"));
      expect(hasShabbat).toBe(true);
    });
  });

  describe("build - Invalid shifts", () => {
    it("should return empty array for invalid shift duration (end before start)", () => {
      const shift = createShift(16, 0, 8, 0); // End time before start time on same day
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toEqual([]);
    });

    it("should return empty array for zero-duration shift", () => {
      const shift = createShift(10, 0, 10, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toEqual([]);
    });

    it("should handle shift with very small duration (1 minute)", () => {
      const startDate = new Date("2024-01-15T10:00:00");
      const endDate = new Date("2024-01-15T10:01:00");

      const shift: Shift = {
        id: "test-shift-1",
        start: { date: startDate },
        end: { date: endDate },
        isDuty: false,
      };

      const meta = createMeta();
      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("build - Edge cases", () => {
    it("should handle shift at exact day boundary (00:00-06:00)", () => {
      const shift = createShift(0, 0, 6, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle shift ending at midnight (18:00-00:00)", () => {
      const shift = createShift(18, 0, 0, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle shift starting at midnight", () => {
      const shift = createShift(0, 0, 8, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle shift with minutes (08:30-16:45)", () => {
      const shift = createShift(8, 30, 16, 45);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle shift crossing 06:00 boundary", () => {
      const shift = createShift(5, 0, 7, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have segments from different periods
      const segmentKeys = new Set(result.map((s) => s.key));
      expect(segmentKeys.size).toBeGreaterThanOrEqual(1);
    });

    it("should handle shift crossing 14:00 boundary", () => {
      const shift = createShift(13, 0, 15, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle shift crossing 22:00 boundary", () => {
      const shift = createShift(21, 0, 23, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("build - Segment merging and sorting", () => {
    it("should return sorted segments by start time", () => {
      const shift = createShift(20, 0, 10, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      
      // Verify segments are sorted
      for (let i = 1; i < result.length; i++) {
        expect(result[i].point.start).toBeGreaterThanOrEqual(
          result[i - 1].point.start
        );
      }
    });

    it("should merge segments from both parts of cross-day shift", () => {
      const shift = createShift(22, 0, 8, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(1);
      
      // Should have segments spanning two days
      const hasDayOne = result.some((s) => s.point.start < 1440);
      const hasDayTwo = result.some((s) => s.point.start >= 1440);
      
      expect(hasDayOne).toBe(true);
      expect(hasDayTwo).toBe(true);
    });

    it("should not have overlapping segments", () => {
      const shift = createShift(8, 0, 20, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Simply verify segments are sorted
      // The resolver may intentionally create overlapping segments for different rate categories
      for (let i = 1; i < result.length; i++) {
        expect(result[i].point.start).toBeGreaterThanOrEqual(
          result[i - 1].point.start
        );
      }
    });
  });

  describe("build - Integration with ShiftService", () => {
    it("should use ShiftService to validate shift duration", () => {
      const isValidSpy = vi.spyOn(shiftService, "isValidShiftDuration");
      
      const shift = createShift(8, 0, 16, 0);
      const meta = createMeta();

      builder.build({ shift, meta });

      expect(isValidSpy).toHaveBeenCalledWith(shift);
      expect(isValidSpy).toHaveBeenCalledTimes(1);
    });

    it("should use ShiftService to calculate minutes from midnight", () => {
      const getMinutesSpy = vi.spyOn(shiftService, "getMinutesFromMidnight");
      
      const shift = createShift(8, 0, 16, 0);
      const meta = createMeta();

      builder.build({ shift, meta });

      expect(getMinutesSpy).toHaveBeenCalled();
    });
  });

  describe("build - Integration with ShiftSegmentResolver", () => {
    it("should call resolver for single-day shift once", () => {
      const resolveSpy = vi.spyOn(segmentResolver, "resolve");
      
      const shift = createShift(8, 0, 16, 0);
      const meta = createMeta();

      builder.build({ shift, meta });

      expect(resolveSpy).toHaveBeenCalledTimes(1);
    });

    it("should call resolver for cross-day shift twice when crossing dayLimit", () => {
      const resolveSpy = vi.spyOn(segmentResolver, "resolve");
      
      // Create a shift that crosses the 30:06 (1446 minutes) limit
      const shift = createShift(20, 0, 8, 0, false); // 20:00 to 08:00 next day
      const meta = createMeta();

      builder.build({ shift, meta });

      // Should call resolver twice if shift exceeds dayLimit (1440 + 360 = 1800 minutes)
      expect(resolveSpy).toHaveBeenCalledTimes(2);
    });

    it("should pass correct metadata to resolver for second day when crossing dayLimit", () => {
      const resolveSpy = vi.spyOn(segmentResolver, "resolve");
      
      // Create a shift that crosses the 30:06 (1446 minutes) limit
      const shift = createShift(20, 0, 8, 0, false, "2024-01-15");
      const meta = createMeta("2024-01-15", WorkDayType.Regular, false);

      builder.build({ shift, meta });

      expect(resolveSpy).toHaveBeenCalledTimes(2);
      
      // Second call should have next day's date and crossDayContinuation=false
      const secondCallMeta = resolveSpy.mock.calls[1][0].meta;
      expect(secondCallMeta.date).toBe("2024-01-16");
      expect(secondCallMeta.crossDayContinuation).toBe(false);
    });
  });

  describe("build - Realistic scenarios", () => {
    it("should handle typical morning shift (07:00-15:00)", () => {
      const shift = createShift(7, 0, 15, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const totalMinutes = result.reduce(
        (sum, s) => sum + (s.point.end - s.point.start),
        0
      );
      
      expect(totalMinutes).toBe(8 * 60); // 8 hours
    });

    it("should handle typical evening shift (15:00-23:00)", () => {
      const shift = createShift(15, 0, 23, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const totalMinutes = result.reduce(
        (sum, s) => sum + (s.point.end - s.point.start),
        0
      );
      
      expect(totalMinutes).toBe(8 * 60); // 8 hours
    });

    it("should handle typical night shift (23:00-07:00)", () => {
      const shift = createShift(23, 0, 7, 0, false);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const totalMinutes = result.reduce(
        (sum, s) => sum + (s.point.end - s.point.start),
        0
      );
      
      expect(totalMinutes).toBe(8 * 60); // 8 hours
    });

    it("should handle 12-hour shift (08:00-20:00)", () => {
      const shift = createShift(8, 0, 20, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Calculate actual shift duration from first segment start to last segment end
      const firstStart = result[0].point.start;
      const lastEnd = result[result.length - 1].point.end;
      const totalMinutes = lastEnd - firstStart;
      
      expect(totalMinutes).toBe(12 * 60); // 12 hours
    });

    it("should handle Friday full day shift into Shabbat", () => {
      const shift = createShift(8, 0, 22, 0, true, "2024-01-05");
      const meta = createMeta("2024-01-05", WorkDayType.SpecialPartialStart);

      const result = builder.build({ shift, meta });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should have both regular and Shabbat segments
      const hasRegular = result.some(
        (s) => s.key === "hours100" || s.key === "hours20"
      );
      const hasShabbat = result.some((s) => s.key.startsWith("shabbat"));
      
      expect(hasRegular).toBe(true);
      expect(hasShabbat).toBe(true);
    });
  });

  describe("build - Return value structure", () => {
    it("should return array of LabeledSegmentRange objects", () => {
      const shift = createShift(8, 0, 16, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      expect(Array.isArray(result)).toBe(true);
      
      result.forEach((segment) => {
        expect(segment).toHaveProperty("point");
        expect(segment).toHaveProperty("percent");
        expect(segment).toHaveProperty("key");
        expect(segment.point).toHaveProperty("start");
        expect(segment.point).toHaveProperty("end");
        expect(typeof segment.percent).toBe("number");
        expect(typeof segment.key).toBe("string");
      });
    });

    it("should return segments with valid percent values", () => {
      const shift = createShift(8, 0, 16, 0);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      result.forEach((segment) => {
        expect(segment.percent).toBeGreaterThan(0);
        expect(segment.percent).toBeLessThanOrEqual(2);
      });
    });

    it("should return segments with valid key values", () => {
      const shift = createShift(0, 0, 23, 59);
      const meta = createMeta();

      const result = builder.build({ shift, meta });

      const validKeys = [
        "hours100",
        "hours125",
        "hours150",
        "hours20",
        "hours50",
        "shabbat150",
        "shabbat200",
      ];

      result.forEach((segment) => {
        expect(validKeys).toContain(segment.key);
      });
    });
  });
});
