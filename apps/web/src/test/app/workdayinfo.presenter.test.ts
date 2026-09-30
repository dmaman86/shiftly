import { describe, it, expect, beforeEach } from "vitest";
import { WorkDayInfoResolver } from "@shiftly/domain";
import { WorkDayInfoPresenter } from "@/app/domain/workdayinfo.presenter";
import { DateService } from "@shiftly/domain";
import { WorkDayType } from "@shiftly/domain";
import type { DomainWorkDay } from "@shiftly/domain";

describe("WorkDayInfoPresenter", () => {
  let resolver: WorkDayInfoPresenter;
  type WorkDayTestCase = DomainWorkDay & { weekdayLabel: string };

  beforeEach(() => {
    resolver = new WorkDayInfoPresenter(new WorkDayInfoResolver(), new DateService());
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

  describe("formatWorkDayLabel", () => {
    it("should format Hebrew day with date for January 1st", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("א-01");
    });

    it("should format Hebrew day with date for January 15th", () => {
      const day = createWorkDayInfo(
        "2024-01-15",
        WorkDayType.Regular,
        false,
        "ב"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ב-15");
    });

    it("should format Hebrew day for Friday", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ו-05");
    });

    it("should format Hebrew day for Saturday", () => {
      const day = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ש-06");
    });

    it("should format Hebrew day for all days of week", () => {
      const weekdayLabels = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
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
          weekdayLabels[index]
        );

        const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

        expect(result).toMatch(new RegExp(`^${weekdayLabels[index]}-\\d{2}$`));
      });
    });

    it("should handle single digit dates with leading zero", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

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

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ה-25");
    });

    it("should handle end of month dates", () => {
      const day = createWorkDayInfo(
        "2024-01-31",
        WorkDayType.Regular,
        false,
        "ד"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ד-31");
    });

    it("should format Hebrew day for a mid-month date", () => {
      const day = createWorkDayInfo(
        "2024-01-15",
        WorkDayType.Regular,
        false,
        "ב"
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

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

      const result1 = resolver.formatWorkDayLabel(day1, day1.weekdayLabel);
      const result2 = resolver.formatWorkDayLabel(day2, day2.weekdayLabel);

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

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toMatch(/^.+-\d{2}$/);
      expect(result.split("-")).toHaveLength(2);
    });

    it("uses the given localized weekday label, so a non-Hebrew locale renders its own weekday abbreviation", () => {
      const day = createWorkDayInfo(
        "2024-01-10",
        WorkDayType.Regular,
        false,
        "ד"
      );

      const result = resolver.formatWorkDayLabel(day, "We");

      expect(result).toBe("We-10");
    });

    it("formats the day number the same way regardless of which weekday label is passed", () => {
      const day = createWorkDayInfo(
        "2024-01-31",
        WorkDayType.Regular,
        false,
        "ד"
      );

      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("ד-31");
      expect(resolver.formatWorkDayLabel(day, "We")).toBe("We-31");
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

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ה-29");
    });

    it("should handle first day of year", () => {
      const day = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א"
      );

      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("א-01");
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

      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("ג-31");
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
      expect(resolver.formatWorkDayLabel(friday, friday.weekdayLabel)).toBe("ו-05");
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
      expect(resolver.formatWorkDayLabel(saturday, saturday.weekdayLabel)).toBe("ש-06");
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
      expect(resolver.formatWorkDayLabel(monday, monday.weekdayLabel)).toBe("ב-01");
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
      expect(resolver.formatWorkDayLabel(erevPesach, erevPesach.weekdayLabel)).toBe("ב-22");
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
      expect(resolver.formatWorkDayLabel(pesach, pesach.weekdayLabel)).toBe("ג-23");
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
      expect(resolver.formatWorkDayLabel(thursday, thursday.weekdayLabel)).toBe("ה-04");
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
      expect(resolver.formatWorkDayLabel(thursday, thursday.weekdayLabel)).toBe("ה-04");
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

      const result1 = resolver.formatWorkDayLabel(day, day.weekdayLabel);
      const result2 = resolver.formatWorkDayLabel(day, day.weekdayLabel);
      const result3 = resolver.formatWorkDayLabel(day, day.weekdayLabel);

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

      resolver.formatWorkDayLabel(day, day.weekdayLabel);
      resolver.isSpecialFullDay(day);
      resolver.isPartialHolidayStart(day);
      resolver.hasCrossDayContinuation(day);

      // Should still work correctly after multiple calls
      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("ב-15");
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
      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("ד-10");
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
      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("ו-12");
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
      expect(resolver.formatWorkDayLabel(day, day.weekdayLabel)).toBe("ש-13");
    });
  });
});
