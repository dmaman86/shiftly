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
    resolver = new WorkDayInfoPresenter(
      new WorkDayInfoResolver(),
      new DateService(),
    );
  });

  const createWorkDayInfo = (
    date: string,
    typeDay: WorkDayType,
    crossDayContinuation: boolean,
    weekdayLabel: string,
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
        "א",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("א-01");
    });

    it("should format Hebrew day with date for January 15th", () => {
      const day = createWorkDayInfo(
        "2024-01-15",
        WorkDayType.Regular,
        false,
        "ב",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ב-15");
    });

    it("should format Hebrew day for Friday", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        false,
        "ו",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ו-05");
    });

    it("should format Hebrew day for Saturday", () => {
      const day = createWorkDayInfo(
        "2024-01-06",
        WorkDayType.SpecialFull,
        false,
        "ש",
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
          weekdayLabels[index],
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
        "ו",
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
        "ה",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ה-25");
    });

    it("should handle end of month dates", () => {
      const day = createWorkDayInfo(
        "2024-01-31",
        WorkDayType.Regular,
        false,
        "ד",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ד-31");
    });

    it("should format Hebrew day for a mid-month date", () => {
      const day = createWorkDayInfo(
        "2024-01-15",
        WorkDayType.Regular,
        false,
        "ב",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toMatch(/^ב-\d{2}$/);
    });

    it("should handle different months correctly", () => {
      const day1 = createWorkDayInfo(
        "2024-02-14",
        WorkDayType.Regular,
        false,
        "ד",
      );
      const day2 = createWorkDayInfo(
        "2024-12-25",
        WorkDayType.Regular,
        false,
        "ד",
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
        "ה",
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
        "ד",
      );

      const result = resolver.formatWorkDayLabel(day, "We");

      expect(result).toBe("We-10");
    });

    it("formats the day number the same way regardless of which weekday label is passed", () => {
      const day = createWorkDayInfo(
        "2024-01-31",
        WorkDayType.Regular,
        false,
        "ד",
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
        "ה",
      );

      const result = resolver.formatWorkDayLabel(day, day.weekdayLabel);

      expect(result).toBe("ה-29");
    });

    it("should handle crossDayContinuation boolean values consistently", () => {
      const dayTrue = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        true,
        "א",
      );
      const dayFalse = createWorkDayInfo(
        "2024-01-01",
        WorkDayType.Regular,
        false,
        "א",
      );

      expect(resolver.hasCrossDayContinuation(dayTrue)).toBe(true);
      expect(resolver.hasCrossDayContinuation(dayFalse)).toBe(false);
    });
  });

  describe("Consistency and Idempotency", () => {
    it("should return consistent results for same input", () => {
      const day = createWorkDayInfo(
        "2024-01-05",
        WorkDayType.SpecialPartialStart,
        true,
        "ו",
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
        "ש",
      );

      expect(resolver.isSpecialFullDay(day)).toBe(true);
      expect(resolver.isSpecialFullDay(day)).toBe(true);
      expect(resolver.isSpecialFullDay(day)).toBe(true);
    });
  });
});
