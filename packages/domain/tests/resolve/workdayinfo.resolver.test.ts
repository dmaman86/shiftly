import { describe, it, expect, beforeEach } from "vitest";
import { WorkDayInfoResolver } from "../../src/resolve/workdayinfo.resolver.js";
import { WorkDayType } from "../../src/constants/index.js";
import type { DomainWorkDay } from "../../src/types/types.js";

describe("WorkDayInfoResolver", () => {
  let resolver: WorkDayInfoResolver;
  type WorkDayTestCase = DomainWorkDay & { weekdayLabel: string };

  beforeEach(() => {
    resolver = new WorkDayInfoResolver();
  });

  const createWorkDayInfo = (
    date: string,
    typeDay: WorkDayType,
    crossDayContinuation: boolean,
    weekdayLabel: string
  ): WorkDayTestCase => ({
    meta: {
      date,
      typeDay,
      crossDayContinuation,
    },
    weekdayLabel,
  });

  describe("isSpecialFullDay", () => {
    it("should return true for SpecialFull day type", () => {
      const day = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      const result = resolver.isSpecialFullDay(day);

      expect(result).toBe(true);
    });

    it("should return false for Regular day type", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      const result = resolver.isSpecialFullDay(day);

      expect(result).toBe(false);
    });

    it("should return false for SpecialPartialStart day type", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.isSpecialFullDay(day);

      expect(result).toBe(false);
    });

    it("should check only typeDay regardless of crossDayContinuation", () => {
      const day1 = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        true,
        "ש"
      );
      const day2 = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      expect(resolver.isSpecialFullDay(day1)).toBe(true);
      expect(resolver.isSpecialFullDay(day2)).toBe(true);
    });

    it("should handle Saturday (Shabbat) correctly", () => {
      const day = createWorkDayInfo(
        "2024-01-06T00:00:00.000Z",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      const result = resolver.isSpecialFullDay(day);

      expect(result).toBe(true);
    });

    it("should handle paid holidays as SpecialFull", () => {
      const day = createWorkDayInfo(
        "2024-04-23",
        WorkDayType.SpecialFull,
        false,
        "ג"
      );

      const result = resolver.isSpecialFullDay(day);

      expect(result).toBe(true);
    });
  });

  describe("isPartialHolidayStart", () => {
    it("should return true for SpecialPartialStart day type", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.isPartialHolidayStart(day);

      expect(result).toBe(true);
    });

    it("should return false for Regular day type", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      const result = resolver.isPartialHolidayStart(day);

      expect(result).toBe(false);
    });

    it("should return false for SpecialFull day type", () => {
      const day = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      const result = resolver.isPartialHolidayStart(day);

      expect(result).toBe(false);
    });

    it("should check only typeDay regardless of crossDayContinuation", () => {
      const day1 = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );
      const day2 = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      expect(resolver.isPartialHolidayStart(day1)).toBe(true);
      expect(resolver.isPartialHolidayStart(day2)).toBe(true);
    });

    it("should handle Friday correctly", () => {
      const day = createWorkDayInfo(
        "2024-01-05T00:00:00.000Z",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.isPartialHolidayStart(day);

      expect(result).toBe(true);
    });

    it("should handle Erev holidays as SpecialPartialStart", () => {
      const day = createWorkDayInfo(
        "2024-04-22",
        WorkDayType.SpecialPartialStart,
        false,
        "ב"
      );

      const result = resolver.isPartialHolidayStart(day);

      expect(result).toBe(true);
    });
  });

  describe("hasCrossDayContinuation", () => {
    it("should return true when crossDayContinuation is true", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );

      const result = resolver.hasCrossDayContinuation(day);

      expect(result).toBe(true);
    });

    it("should return false when crossDayContinuation is false", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      const result = resolver.hasCrossDayContinuation(day);

      expect(result).toBe(false);
    });

    it("should work with Regular day type", () => {
      const day1 = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        true,
        "א"
      );
      const day2 = createWorkDayInfo(
        "2024-01-02",
        WorkDayType.Regular,
        false,
        "ב"
      );

      expect(resolver.hasCrossDayContinuation(day1)).toBe(true);
      expect(resolver.hasCrossDayContinuation(day2)).toBe(false);
    });

    it("should work with SpecialFull day type", () => {
      const day1 = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        true,
        "ש"
      );
      const day2 = createWorkDayInfo(
        "2024-01-13",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      expect(resolver.hasCrossDayContinuation(day1)).toBe(true);
      expect(resolver.hasCrossDayContinuation(day2)).toBe(false);
    });

    it("should work with SpecialPartialStart day type", () => {
      const day1 = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );
      const day2 = createWorkDayInfo(
        "2024-01-12",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      expect(resolver.hasCrossDayContinuation(day1)).toBe(true);
      expect(resolver.hasCrossDayContinuation(day2)).toBe(false);
    });

    it("should handle typical Friday before Saturday scenario", () => {
      const friday = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );

      const result = resolver.hasCrossDayContinuation(friday);

      expect(result).toBe(true);
    });

    it("should handle typical Thursday before regular Friday", () => {
      const thursday = createWorkDayInfo(
        "2024-01-04",
        WorkDayType.Regular,
        false,
        "ה"
      );

      const result = resolver.hasCrossDayContinuation(thursday);

      expect(result).toBe(false);
    });
  });
});
