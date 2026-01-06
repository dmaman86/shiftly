import { describe, it, expect, beforeEach } from "vitest";
import { WorkDayInfoResolver } from "@/domain/resolve/workdayinfo.resolver";
import { WorkDayType } from "@/constants/fields.constant";
import type { WorkDayInfo } from "@/domain/types/types";

describe("WorkDayInfoResolver", () => {
  let resolver: WorkDayInfoResolver;

  beforeEach(() => {
    resolver = new WorkDayInfoResolver();
  });

  // Helper function to create WorkDayInfo
  const createWorkDayInfo = (
    date: string,
    typeDay: WorkDayType,
    crossDayContinuation: boolean,
    hebrewDay: string
  ): WorkDayInfo => ({
    meta: {
      date,
      typeDay,
      crossDayContinuation,
    },
    hebrewDay,
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

  describe("formatHebrewWorkDay", () => {
    it("should format Hebrew day with date for January 1st", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("א-01");
    });

    it("should format Hebrew day with date for January 15th", () => {
      const day = createWorkDayInfo(
        "2024-01-15",
        WorkDayType.Regular,
        false,
        "ב"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ב-15");
    });

    it("should format Hebrew day for Friday", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ו-05");
    });

    it("should format Hebrew day for Saturday", () => {
      const day = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ש-06");
    });

    it("should format Hebrew day for all days of week", () => {
      const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
      const dates = [
        "2024-01-07", // Sunday
        "2024-01-08", // Monday
        "2024-01-09", // Tuesday
        "2024-01-10", // Wednesday
        "2024-01-11", // Thursday
        "2024-01-12", // Friday
        "2024-01-13", // Saturday
      ];

      dates.forEach((date, index) => {
        const day = createWorkDayInfo(
          date,
          WorkDayType.Regular,
          false,
          hebrewDays[index]
        );

        const result = resolver.formatHebrewWorkDay(day);

        expect(result).toMatch(new RegExp(`^${hebrewDays[index]}-\\d{2}$`));
      });
    });

    it("should handle single digit dates with leading zero", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ו-05");
      expect(result).toMatch(/^.+-\d{2}$/);
    });

    it("should handle double digit dates", () => {
      const day = createWorkDayInfo(
        "2024-01-25",
        WorkDayType.Regular,
        false,
        "ה"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ה-25");
    });

    it("should handle end of month dates", () => {
      const day = createWorkDayInfo(
        "2024-01-31",
        WorkDayType.Regular,
        false,
        "ד"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ד-31");
    });

    it("should format Hebrew day with ISO date string", () => {
      const day = createWorkDayInfo(
        "2024-01-15T00:00:00.000Z",
        WorkDayType.Regular,
        false,
        "ב"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toMatch(/^ב-\d{2}$/);
    });

    it("should handle different months correctly", () => {
      const day1 = createWorkDayInfo(
        "2024-02-14",
        WorkDayType.Regular,
        false,
        "ד"
      );
      const day2 = createWorkDayInfo(
        "2024-12-25",
        WorkDayType.Regular,
        false,
        "ד"
      );

      const result1 = resolver.formatHebrewWorkDay(day1);
      const result2 = resolver.formatHebrewWorkDay(day2);

      expect(result1).toBe("ד-14");
      expect(result2).toBe("ד-25");
    });

    it("should always return format: hebrewLetter-twoDigitDay", () => {
      const day = createWorkDayInfo(
        "2024-03-07",
        WorkDayType.Regular,
        false,
        "ה"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toMatch(/^.+-\d{2}$/);
      expect(result.split("-")).toHaveLength(2);
    });
  });

  describe("Edge Cases and Boundaries", () => {
    it("should handle leap year date", () => {
      const day = createWorkDayInfo(
        "2024-02-29",
        WorkDayType.Regular,
        false,
        "ה"
      );

      const result = resolver.formatHebrewWorkDay(day);

      expect(result).toBe("ה-29");
    });

    it("should handle first day of year", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      expect(resolver.formatHebrewWorkDay(day)).toBe("א-01");
      expect(resolver.isSpecialFullDay(day)).toBe(false);
      expect(resolver.isPartialHolidayStart(day)).toBe(false);
      expect(resolver.hasCrossDayContinuation(day)).toBe(false);
    });

    it("should handle last day of year", () => {
      const day = createWorkDayInfo(
        "2024-12-31",
        WorkDayType.Regular,
        false,
        "ג"
      );

      expect(resolver.formatHebrewWorkDay(day)).toBe("ג-31");
      expect(resolver.isSpecialFullDay(day)).toBe(false);
      expect(resolver.isPartialHolidayStart(day)).toBe(false);
      expect(resolver.hasCrossDayContinuation(day)).toBe(false);
    });

    it("should handle all WorkDayType enum values", () => {
      const types = [
        WorkDayType.Regular,
        WorkDayType.SpecialPartialStart,
        WorkDayType.SpecialFull,
      ];

      types.forEach((type) => {
        const day = createWorkDayInfo("2024-01-15", type, false, "ב");

        const isSpecialFull = resolver.isSpecialFullDay(day);
        const isPartialStart = resolver.isPartialHolidayStart(day);

        expect(typeof isSpecialFull).toBe("boolean");
        expect(typeof isPartialStart).toBe("boolean");
      });
    });

    it("should handle crossDayContinuation boolean values consistently", () => {
      const dayTrue = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        true,
        "א"
      );
      const dayFalse = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      expect(resolver.hasCrossDayContinuation(dayTrue)).toBe(true);
      expect(resolver.hasCrossDayContinuation(dayFalse)).toBe(false);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical Friday before Shabbat", () => {
      const friday = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );

      expect(resolver.isSpecialFullDay(friday)).toBe(false);
      expect(resolver.isPartialHolidayStart(friday)).toBe(true);
      expect(resolver.hasCrossDayContinuation(friday)).toBe(true);
      expect(resolver.formatHebrewWorkDay(friday)).toBe("ו-05");
    });

    it("should handle typical Shabbat (Saturday)", () => {
      const saturday = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      expect(resolver.isSpecialFullDay(saturday)).toBe(true);
      expect(resolver.isPartialHolidayStart(saturday)).toBe(false);
      expect(resolver.hasCrossDayContinuation(saturday)).toBe(false);
      expect(resolver.formatHebrewWorkDay(saturday)).toBe("ש-06");
    });

    it("should handle typical weekday (Monday)", () => {
      const monday = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "ב"
      );

      expect(resolver.isSpecialFullDay(monday)).toBe(false);
      expect(resolver.isPartialHolidayStart(monday)).toBe(false);
      expect(resolver.hasCrossDayContinuation(monday)).toBe(false);
      expect(resolver.formatHebrewWorkDay(monday)).toBe("ב-01");
    });

    it("should handle Erev Pesach scenario", () => {
      const erevPesach = createWorkDayInfo(
        "2024-04-22",
        WorkDayType.SpecialPartialStart,
        true,
        "ב"
      );

      expect(resolver.isSpecialFullDay(erevPesach)).toBe(false);
      expect(resolver.isPartialHolidayStart(erevPesach)).toBe(true);
      expect(resolver.hasCrossDayContinuation(erevPesach)).toBe(true);
      expect(resolver.formatHebrewWorkDay(erevPesach)).toBe("ב-22");
    });

    it("should handle Pesach I scenario", () => {
      const pesach = createWorkDayInfo(
        "2024-04-23",
        WorkDayType.SpecialFull,
        false,
        "ג"
      );

      expect(resolver.isSpecialFullDay(pesach)).toBe(true);
      expect(resolver.isPartialHolidayStart(pesach)).toBe(false);
      expect(resolver.hasCrossDayContinuation(pesach)).toBe(false);
      expect(resolver.formatHebrewWorkDay(pesach)).toBe("ג-23");
    });

    it("should handle regular Thursday before regular Friday", () => {
      const thursday = createWorkDayInfo(
        "2024-01-04",
        WorkDayType.Regular,
        false,
        "ה"
      );

      expect(resolver.isSpecialFullDay(thursday)).toBe(false);
      expect(resolver.isPartialHolidayStart(thursday)).toBe(false);
      expect(resolver.hasCrossDayContinuation(thursday)).toBe(false);
      expect(resolver.formatHebrewWorkDay(thursday)).toBe("ה-04");
    });

    it("should handle crossDayShift scenario starting Thursday night", () => {
      const thursday = createWorkDayInfo(
        "2024-01-04",
        WorkDayType.Regular,
        true,
        "ה"
      );

      expect(resolver.isSpecialFullDay(thursday)).toBe(false);
      expect(resolver.isPartialHolidayStart(thursday)).toBe(false);
      expect(resolver.hasCrossDayContinuation(thursday)).toBe(true);
      expect(resolver.formatHebrewWorkDay(thursday)).toBe("ה-04");
    });
  });

  describe("Consistency and Idempotency", () => {
    it("should return consistent results for same input", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );

      const result1 = resolver.formatHebrewWorkDay(day);
      const result2 = resolver.formatHebrewWorkDay(day);
      const result3 = resolver.formatHebrewWorkDay(day);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should return consistent boolean results", () => {
      const day = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      expect(resolver.isSpecialFullDay(day)).toBe(true);
      expect(resolver.isSpecialFullDay(day)).toBe(true);
      expect(resolver.isSpecialFullDay(day)).toBe(true);
    });

    it("should handle multiple calls without side effects", () => {
      const day = createWorkDayInfo(
        "2024-01-15",
        WorkDayType.Regular,
        false,
        "ב"
      );

      resolver.formatHebrewWorkDay(day);
      resolver.isSpecialFullDay(day);
      resolver.isPartialHolidayStart(day);
      resolver.hasCrossDayContinuation(day);

      // Should still work correctly after multiple calls
      expect(resolver.formatHebrewWorkDay(day)).toBe("ב-15");
      expect(resolver.isSpecialFullDay(day)).toBe(false);
    });
  });

  describe("All Method Combinations", () => {
    it("should correctly evaluate all methods for Regular day", () => {
      const day = createWorkDayInfo(
        "2024-01-10",
        WorkDayType.Regular,
        false,
        "ד"
      );

      expect(resolver.isSpecialFullDay(day)).toBe(false);
      expect(resolver.isPartialHolidayStart(day)).toBe(false);
      expect(resolver.hasCrossDayContinuation(day)).toBe(false);
      expect(resolver.formatHebrewWorkDay(day)).toBe("ד-10");
    });

    it("should correctly evaluate all methods for SpecialPartialStart day", () => {
      const day = createWorkDayInfo(
        "2024-01-12",
        WorkDayType.SpecialPartialStart,
        true,
        "ו"
      );

      expect(resolver.isSpecialFullDay(day)).toBe(false);
      expect(resolver.isPartialHolidayStart(day)).toBe(true);
      expect(resolver.hasCrossDayContinuation(day)).toBe(true);
      expect(resolver.formatHebrewWorkDay(day)).toBe("ו-12");
    });

    it("should correctly evaluate all methods for SpecialFull day", () => {
      const day = createWorkDayInfo(
        "2024-01-13",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      expect(resolver.isSpecialFullDay(day)).toBe(true);
      expect(resolver.isPartialHolidayStart(day)).toBe(false);
      expect(resolver.hasCrossDayContinuation(day)).toBe(false);
      expect(resolver.formatHebrewWorkDay(day)).toBe("ש-13");
    });
  });
});
