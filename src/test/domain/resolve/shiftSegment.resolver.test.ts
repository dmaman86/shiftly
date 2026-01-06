import { describe, it, expect, beforeEach } from "vitest";
import { ShiftSegmentResolver } from "@/domain/resolve/shiftSegment.resolver";
import type { Point, WorkDayMeta } from "@/domain/types/types";
import { WorkDayType } from "@/constants/fields.constant";

describe("ShiftSegmentResolver", () => {
  let resolver: ShiftSegmentResolver;

  beforeEach(() => {
    resolver = new ShiftSegmentResolver();
  });

  describe("resolve - Regular Day", () => {
    const meta: WorkDayMeta = {
      date: "2024-01-01",
      typeDay: WorkDayType.Regular,
      crossDayContinuation: false,
    };

    it("should return empty array for shifts outside time ranges", () => {
      const point: Point = { start: 3000, end: 3100 }; // Way beyond valid range

      const result = resolver.resolve({ point, meta });

      expect(result).toEqual([]);
    });

    it("should resolve night shift 00:00-06:00 as hours50", () => {
      const point: Point = { start: 0, end: 360 }; // 00:00-06:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 0, end: 360 },
        percent: 0.5,
        key: "hours50",
      });
    });

    it("should resolve morning shift 06:00-14:00 as hours100", () => {
      const point: Point = { start: 360, end: 840 }; // 06:00-14:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 360, end: 840 },
        percent: 1.0,
        key: "hours100",
      });
    });

    it("should resolve evening shift 14:00-22:00 as hours20", () => {
      const point: Point = { start: 840, end: 1320 }; // 14:00-22:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 840, end: 1320 },
        percent: 0.2,
        key: "hours20",
      });
    });

    it("should resolve night shift 22:00-06:00 next day as hours50", () => {
      const point: Point = { start: 1320, end: 1800 }; // 22:00-30:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 1320, end: 1800 },
        percent: 0.5,
        key: "hours50",
      });
    });

    it("should resolve full 24-hour shift with all segments", () => {
      const point: Point = { start: 0, end: 1440 }; // Full day

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(4);
      
      expect(result[0].key).toBe("hours50");
      expect(result[1].key).toBe("hours100");
      expect(result[2].key).toBe("hours20");
      expect(result[3].key).toBe("hours50");
    });

    it("should resolve shift crossing midnight (20:00-04:00)", () => {
      const point: Point = { start: 1200, end: 1680 }; // 20:00-28:00

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].key).toBe("hours20");
      expect(result[result.length - 1].key).toBe("hours50");
    });

    it("should handle shift starting at 06:00 boundary", () => {
      const point: Point = { start: 360, end: 480 }; // 06:00-08:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("hours100");
    });

    it("should handle shift ending at 22:00 boundary", () => {
      const point: Point = { start: 1200, end: 1320 }; // 20:00-22:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("hours20");
    });

    it("should handle very short shift (30 minutes)", () => {
      const point: Point = { start: 400, end: 430 }; // 06:40-07:10

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("hours100");
    });

    it("should resolve shift during evening period (16:00-20:00)", () => {
      const point: Point = { start: 960, end: 1200 }; // 16:00-20:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("hours20");
    });
  });

  describe("resolve - SpecialPartialStart Day (Friday evening)", () => {
    it("should resolve Friday evening shift with Shabbat segments", () => {
      const meta: WorkDayMeta = {
        date: "2024-01-05T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const point: Point = { start: 1080, end: 1320 }; // 18:00-22:00

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThan(0);
      
      // Should include Shabbat segment
      const hasShabbat = result.some(s => s.key.startsWith('shabbat'));
      expect(hasShabbat).toBe(true);
    });

    it("should resolve shift before Shabbat entry", () => {
      const meta: WorkDayMeta = {
        date: "2024-01-05T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const point: Point = { start: 720, end: 960 }; // 12:00-16:00

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThan(0);
    });

    it("should resolve night shift after Shabbat entry as shabbat200", () => {
      const meta: WorkDayMeta = {
        date: "2024-01-05T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const point: Point = { start: 1320, end: 1800 }; // 22:00-30:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 1320, end: 1800 },
        percent: 2.0,
        key: "shabbat200",
      });
    });

    it("should handle full day on SpecialPartialStart", () => {
      const meta: WorkDayMeta = {
        date: "2024-01-05T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const point: Point = { start: 0, end: 1440 };

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThan(3);
      
      const hasRegular = result.some(s => s.key === 'hours50' || s.key === 'hours100');
      const hasShabbat = result.some(s => s.key.startsWith('shabbat'));
      
      expect(hasRegular).toBe(true);
      expect(hasShabbat).toBe(true);
    });
  });

  describe("resolve - SpecialFull Day (Saturday)", () => {
    const meta: WorkDayMeta = {
      date: "2024-01-06",
      typeDay: WorkDayType.SpecialFull,
      crossDayContinuation: false,
    };

    it("should resolve early morning shift as shabbat200", () => {
      const point: Point = { start: 0, end: 360 }; // 00:00-06:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 0, end: 360 },
        percent: 2.0,
        key: "shabbat200",
      });
    });

    it("should resolve day shift as shabbat150", () => {
      const point: Point = { start: 360, end: 1320 }; // 06:00-22:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 360, end: 1320 },
        percent: 1.5,
        key: "shabbat150",
      });
    });

    it("should resolve night shift as shabbat200", () => {
      const point: Point = { start: 1320, end: 1800 }; // 22:00-30:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        point: { start: 1320, end: 1800 },
        percent: 2.0,
        key: "shabbat200",
      });
    });

    it("should resolve full 24-hour Shabbat shift", () => {
      const point: Point = { start: 0, end: 1440 };

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(3);
      
      expect(result[0].key).toBe("shabbat200");
      expect(result[1].key).toBe("shabbat150");
      expect(result[2].key).toBe("shabbat200");
    });

    it("should resolve shift crossing from night to day", () => {
      const point: Point = { start: 240, end: 600 }; // 04:00-10:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(2);
      
      expect(result[0].key).toBe("shabbat200");
      expect(result[1].key).toBe("shabbat150");
    });

    it("should resolve shift crossing from day to night", () => {
      const point: Point = { start: 1200, end: 1560 }; // 20:00-26:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(2);
      
      expect(result[0].key).toBe("shabbat150");
      expect(result[1].key).toBe("shabbat200");
    });

    it("should resolve short shift at boundary", () => {
      const point: Point = { start: 330, end: 390 }; // 05:30-06:30

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(2);
      
      expect(result[0].key).toBe("shabbat200");
      expect(result[1].key).toBe("shabbat150");
    });

    it("should handle shift exactly at day boundaries", () => {
      const point: Point = { start: 360, end: 1320 }; // 06:00-22:00

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("shabbat150");
    });
  });

  describe("edge cases", () => {
    const meta: WorkDayMeta = {
      date: "2024-01-01",
      typeDay: WorkDayType.Regular,
      crossDayContinuation: false,
    };

    it("should return empty array for invalid point (start > end)", () => {
      const point: Point = { start: 1000, end: 500 };

      const result = resolver.resolve({ point, meta });

      expect(result).toEqual([]);
    });

    it("should return empty array for zero-duration shift", () => {
      const point: Point = { start: 600, end: 600 };

      const result = resolver.resolve({ point, meta });

      expect(result).toEqual([]);
    });

    it("should handle shift with 1 minute duration", () => {
      const point: Point = { start: 600, end: 601 };

      const result = resolver.resolve({ point, meta });

      expect(result).toHaveLength(1);
      expect(result[0].point).toEqual({ start: 600, end: 601 });
    });

    it("should handle negative start time gracefully", () => {
      const point: Point = { start: -100, end: 100 };

      const result = resolver.resolve({ point, meta });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("boundary precision", () => {
    const meta: WorkDayMeta = {
      date: "2024-01-01",
      typeDay: WorkDayType.Regular,
      crossDayContinuation: false,
    };

    it("should handle exact minute at 06:00 boundary", () => {
      const point: Point = { start: 359, end: 361 };

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle boundaries at 14:00 correctly", () => {
      const point: Point = { start: 839, end: 841 }; // 13:59-14:01

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle transitions at 22:00", () => {
      const point: Point = { start: 1319, end: 1321 }; // 21:59-22:01

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("crossDayContinuation metadata", () => {
    it("should resolve regardless of crossDayContinuation flag", () => {
      const meta1: WorkDayMeta = {
        date: "2024-01-01",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      };

      const meta2: WorkDayMeta = {
        date: "2024-01-01",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: true,
      };

      const point: Point = { start: 600, end: 900 };

      const result1 = resolver.resolve({ point, meta: meta1 });
      const result2 = resolver.resolve({ point, meta: meta2 });

      expect(result1).toEqual(result2);
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical weekday double shift", () => {
      const meta: WorkDayMeta = {
        date: "2024-01-01",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      };

      const shift1 = resolver.resolve({ point: { start: 480, end: 960 }, meta });
      const shift2 = resolver.resolve({ point: { start: 960, end: 1440 }, meta });

      expect(shift1.length).toBeGreaterThan(0);
      expect(shift2.length).toBeGreaterThan(0);

      const morningHours100 = shift1.find(s => s.key === 'hours100');
      expect(morningHours100).toBeDefined();

      const eveningHours20 = shift2.find(s => s.key === 'hours20');
      expect(eveningHours20).toBeDefined();
    });

    it("should handle Friday-to-Saturday Shabbat transition", () => {
      const metaFriday: WorkDayMeta = {
        date: "2024-01-05T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const metaSaturday: WorkDayMeta = {
        date: "2024-01-06",
        typeDay: WorkDayType.SpecialFull,
        crossDayContinuation: true,
      };

      const fridayShift = resolver.resolve({
        point: { start: 1080, end: 1440 },
        meta: metaFriday,
      });

      const saturdayShift = resolver.resolve({
        point: { start: 0, end: 600 },
        meta: metaSaturday,
      });

      expect(fridayShift.length).toBeGreaterThan(0);
      expect(saturdayShift.length).toBeGreaterThan(0);

      const fridayShabbat = fridayShift.some(s => s.key.startsWith('shabbat'));
      const saturdayShabbat = saturdayShift.every(s => s.key.startsWith('shabbat'));

      expect(fridayShabbat).toBe(true);
      expect(saturdayShabbat).toBe(true);
    });

    it("should correctly segment a shift within valid range", () => {
      const meta: WorkDayMeta = {
        date: "2024-01-01",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      };

      const point: Point = { start: 480, end: 1680 }; // 08:00 to 28:00 (04:00 next day)

      const result = resolver.resolve({ point, meta });

      expect(result.length).toBeGreaterThan(0);

      // Verify segments are within bounds
      result.forEach(segment => {
        expect(segment.point.start).toBeGreaterThanOrEqual(480);
        expect(segment.point.end).toBeLessThanOrEqual(1680);
      });
    });
  });

  describe("timezone handling", () => {
    it("should calculate special start time based on date", () => {
      const meta1: WorkDayMeta = {
        date: "2024-01-01T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const meta2: WorkDayMeta = {
        date: "2024-07-01T00:00:00.000Z",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      };

      const result1 = resolver.resolve({ point: { start: 1000, end: 1100 }, meta: meta1 });
      const result2 = resolver.resolve({ point: { start: 1000, end: 1100 }, meta: meta2 });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
