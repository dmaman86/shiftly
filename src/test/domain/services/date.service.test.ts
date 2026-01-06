import { describe, it, expect, beforeEach } from "vitest";
import { DateService } from "@/domain/services/date.service";

describe("DateService", () => {
  let service: DateService;

  beforeEach(() => {
    service = new DateService();
  });

  describe("getMinutesFromMidnight", () => {
    it("should return 0 for midnight (00:00)", () => {
      const date = new Date(2025, 0, 1, 0, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(0);
    });

    it("should return 60 for 01:00", () => {
      const date = new Date(2025, 0, 1, 1, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(60);
    });

    it("should return 540 for 09:00", () => {
      const date = new Date(2025, 0, 1, 9, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(540);
    });

    it("should return 720 for 12:00 (noon)", () => {
      const date = new Date(2025, 0, 1, 12, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(720);
    });

    it("should return 1380 for 23:00", () => {
      const date = new Date(2025, 0, 1, 23, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(1380);
    });

    it("should handle minutes correctly (09:30)", () => {
      const date = new Date(2025, 0, 1, 9, 30, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(570); // 9*60 + 30
    });

    it("should handle 23:59", () => {
      const date = new Date(2025, 0, 1, 23, 59, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(1439); // 23*60 + 59
    });

    it("should ignore seconds and milliseconds", () => {
      const date = new Date(2025, 0, 1, 10, 30, 45, 999);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(630); // 10*60 + 30
    });
  });

  describe("getDaysDifference", () => {
    it("should return 0 for the same day", () => {
      const date1 = new Date(2025, 0, 15, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 18, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(0);
    });

    it("should return 1 for consecutive days", () => {
      const date1 = new Date(2025, 0, 16, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 18, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(1);
    });

    it("should return -1 for previous day", () => {
      const date1 = new Date(2025, 0, 14, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 18, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(-1);
    });

    it("should return 7 for one week difference", () => {
      const date1 = new Date(2025, 0, 22, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 18, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(7);
    });

    it("should return 30 for approximately one month", () => {
      const date1 = new Date(2025, 1, 14, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 18, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(30);
    });

    it("should handle year boundaries", () => {
      const date1 = new Date(2025, 0, 1, 10, 0, 0);
      const date2 = new Date(2024, 11, 31, 18, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(1);
    });

    it("should ignore time when calculating days", () => {
      const date1 = new Date(2025, 0, 16, 23, 59, 59);
      const date2 = new Date(2025, 0, 15, 0, 0, 0);
      const result = service.getDaysDifference(date1, date2);

      expect(result).toBe(1);
    });
  });

  describe("isAfterDate", () => {
    it("should return true when date1 is after date2", () => {
      const date1 = new Date(2025, 0, 15, 18, 0, 0);
      const date2 = new Date(2025, 0, 15, 10, 0, 0);
      const result = service.isAfterDate(date1, date2);

      expect(result).toBe(true);
    });

    it("should return false when date1 is before date2", () => {
      const date1 = new Date(2025, 0, 15, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 18, 0, 0);
      const result = service.isAfterDate(date1, date2);

      expect(result).toBe(false);
    });

    it("should return false when dates are equal", () => {
      const date1 = new Date(2025, 0, 15, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 10, 0, 0);
      const result = service.isAfterDate(date1, date2);

      expect(result).toBe(false);
    });

    it("should consider time when comparing", () => {
      const date1 = new Date(2025, 0, 15, 10, 0, 1);
      const date2 = new Date(2025, 0, 15, 10, 0, 0);
      const result = service.isAfterDate(date1, date2);

      expect(result).toBe(true);
    });

    it("should work across different days", () => {
      const date1 = new Date(2025, 0, 16, 0, 0, 0);
      const date2 = new Date(2025, 0, 15, 23, 59, 59);
      const result = service.isAfterDate(date1, date2);

      expect(result).toBe(true);
    });
  });

  describe("addDaysToDate", () => {
    it("should add 1 day correctly", () => {
      const date = new Date(2025, 0, 15, 10, 30, 0);
      const result = service.addDaysToDate(date, 1);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(16);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });

    it("should add 7 days correctly", () => {
      const date = new Date(2025, 0, 15, 10, 30, 0);
      const result = service.addDaysToDate(date, 7);

      expect(result.getDate()).toBe(22);
    });

    it("should subtract days with negative number", () => {
      const date = new Date(2025, 0, 15, 10, 30, 0);
      const result = service.addDaysToDate(date, -1);

      expect(result.getDate()).toBe(14);
    });

    it("should handle month boundaries", () => {
      const date = new Date(2025, 0, 31, 10, 30, 0);
      const result = service.addDaysToDate(date, 1);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });

    it("should handle year boundaries", () => {
      const date = new Date(2024, 11, 31, 10, 30, 0);
      const result = service.addDaysToDate(date, 1);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    it("should add 0 days (no change)", () => {
      const date = new Date(2025, 0, 15, 10, 30, 0);
      const result = service.addDaysToDate(date, 0);

      expect(result.getDate()).toBe(15);
    });
  });

  describe("minutesToTimeStr", () => {
    it("should convert 0 minutes to 00:00", () => {
      const result = service.minutesToTimeStr(0);

      expect(result).toBe("00:00");
    });

    it("should convert 60 minutes to 01:00", () => {
      const result = service.minutesToTimeStr(60);

      expect(result).toBe("01:00");
    });

    it("should convert 540 minutes to 09:00", () => {
      const result = service.minutesToTimeStr(540);

      expect(result).toBe("09:00");
    });

    it("should convert 720 minutes to 12:00", () => {
      const result = service.minutesToTimeStr(720);

      expect(result).toBe("12:00");
    });

    it("should convert 570 minutes to 09:30", () => {
      const result = service.minutesToTimeStr(570);

      expect(result).toBe("09:30");
    });

    it("should convert 1439 minutes to 23:59", () => {
      const result = service.minutesToTimeStr(1439);

      expect(result).toBe("23:59");
    });

    it("should handle 1440 minutes (24 hours) as 00:00", () => {
      const result = service.minutesToTimeStr(1440);

      expect(result).toBe("00:00");
    });

    it("should handle minutes beyond 24 hours with modulo", () => {
      const result = service.minutesToTimeStr(1500); // 25 hours

      expect(result).toBe("01:00"); // 1500 % 1440 = 60
    });

    it("should handle 2880 minutes (48 hours) as 00:00", () => {
      const result = service.minutesToTimeStr(2880);

      expect(result).toBe("00:00");
    });

    it("should pad single digit hours and minutes", () => {
      const result = service.minutesToTimeStr(65); // 1 hour 5 minutes

      expect(result).toBe("01:05");
    });
  });

  describe("formatDate", () => {
    it("should format date as yyyy-MM-dd", () => {
      const date = new Date(2025, 0, 15, 10, 30, 0);
      const result = service.formatDate(date);

      expect(result).toBe("2025-01-15");
    });

    it("should pad single digit month", () => {
      const date = new Date(2025, 0, 1, 10, 30, 0);
      const result = service.formatDate(date);

      expect(result).toBe("2025-01-01");
    });

    it("should pad single digit day", () => {
      const date = new Date(2025, 11, 5, 10, 30, 0);
      const result = service.formatDate(date);

      expect(result).toBe("2025-12-05");
    });

    it("should handle end of year", () => {
      const date = new Date(2024, 11, 31, 23, 59, 59);
      const result = service.formatDate(date);

      expect(result).toBe("2024-12-31");
    });

    it("should ignore time component", () => {
      const date = new Date(2025, 5, 15, 23, 59, 59);
      const result = service.formatDate(date);

      expect(result).toBe("2025-06-15");
    });
  });

  describe("createDateWithTime", () => {
    it("should create date with default time (00:00)", () => {
      const result = service.createDateWithTime("2025-01-15");

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should create date with specified hours", () => {
      const result = service.createDateWithTime("2025-01-15", 9);

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });

    it("should create date with specified hours and minutes", () => {
      const result = service.createDateWithTime("2025-01-15", 9, 30);

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });

    it("should handle midnight", () => {
      const result = service.createDateWithTime("2025-01-15", 0, 0);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should handle 23:59", () => {
      const result = service.createDateWithTime("2025-01-15", 23, 59);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });

    it("should parse date string correctly", () => {
      const result = service.createDateWithTime("2025-12-31", 10, 30);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December (0-indexed)
      expect(result.getDate()).toBe(31);
    });

    it("should set seconds and milliseconds to 0", () => {
      const result = service.createDateWithTime("2025-01-15", 10, 30);

      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe("getNextMonthDay", () => {
    it("should return first day of next month (January -> February)", () => {
      const result = service.getNextMonthDay(2025, 1);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it("should return first day of next month (June -> July)", () => {
      const result = service.getNextMonthDay(2025, 6);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(6); // July (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it("should handle year boundary (December -> January)", () => {
      const result = service.getNextMonthDay(2024, 12);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it("should handle February in leap year", () => {
      const result = service.getNextMonthDay(2024, 2);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it("should handle February in non-leap year", () => {
      const result = service.getNextMonthDay(2025, 2);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getDate()).toBe(1);
    });
  });

  describe("getDaysInMonth", () => {
    it("should return 31 for January", () => {
      const result = service.getDaysInMonth(2025, 1);

      expect(result).toBe(31);
    });

    it("should return 28 for February in non-leap year", () => {
      const result = service.getDaysInMonth(2025, 2);

      expect(result).toBe(28);
    });

    it("should return 29 for February in leap year", () => {
      const result = service.getDaysInMonth(2024, 2);

      expect(result).toBe(29);
    });

    it("should return 31 for March", () => {
      const result = service.getDaysInMonth(2025, 3);

      expect(result).toBe(31);
    });

    it("should return 30 for April", () => {
      const result = service.getDaysInMonth(2025, 4);

      expect(result).toBe(30);
    });

    it("should return 31 for May", () => {
      const result = service.getDaysInMonth(2025, 5);

      expect(result).toBe(31);
    });

    it("should return 30 for June", () => {
      const result = service.getDaysInMonth(2025, 6);

      expect(result).toBe(30);
    });

    it("should return 31 for December", () => {
      const result = service.getDaysInMonth(2025, 12);

      expect(result).toBe(31);
    });
  });

  describe("getDatesRange", () => {
    it("should return correct range for January", () => {
      const result = service.getDatesRange(2025, 1);

      expect(result.startDate).toBe("2025-01-01");
      expect(result.endDate).toBe("2025-02-01");
    });

    it("should return correct range for December", () => {
      const result = service.getDatesRange(2024, 12);

      expect(result.startDate).toBe("2024-12-01");
      expect(result.endDate).toBe("2025-01-01");
    });

    it("should return correct range for February in leap year", () => {
      const result = service.getDatesRange(2024, 2);

      expect(result.startDate).toBe("2024-02-01");
      expect(result.endDate).toBe("2024-03-01");
    });

    it("should return correct range for June", () => {
      const result = service.getDatesRange(2025, 6);

      expect(result.startDate).toBe("2025-06-01");
      expect(result.endDate).toBe("2025-07-01");
    });

    it("should have startDate and endDate properties", () => {
      const result = service.getDatesRange(2025, 1);

      expect(result).toHaveProperty("startDate");
      expect(result).toHaveProperty("endDate");
    });

    it("should format dates as yyyy-MM-dd", () => {
      const result = service.getDatesRange(2025, 3);

      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getSpecialStartMinutes", () => {
    it("should return correct minutes based on timezone offset", () => {
      const date = "2025-01-15";
      const result = service.getSpecialStartMinutes(date);

      // Result depends on local timezone offset
      // Should be either 1020 (17:00) or 1080 (18:00)
      expect([1020, 1080]).toContain(result);
    });

    it("should calculate based on timezone offset formula", () => {
      const date = "2025-06-15";
      const testDate = new Date(date);
      const offsetMinutes = testDate.getTimezoneOffset();
      const expectedHour = -offsetMinutes / 60 === 3 ? 18 : 17;
      const expectedMinutes = expectedHour * 60;

      const result = service.getSpecialStartMinutes(date);

      expect(result).toBe(expectedMinutes);
    });

    it("should handle date string format", () => {
      const date = "2025-06-15";
      const result = service.getSpecialStartMinutes(date);

      // Result should be either 1020 or 1080 minutes
      expect(result).toBeGreaterThanOrEqual(1020);
      expect(result).toBeLessThanOrEqual(1080);
      expect([1020, 1080]).toContain(result);
    });

    it("should be consistent for same date", () => {
      const date1 = "2025-01-15";
      const date2 = "2025-01-15";

      const result1 = service.getSpecialStartMinutes(date1);
      const result2 = service.getSpecialStartMinutes(date2);

      expect(result1).toBe(result2);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete date workflow", () => {
      // Create a date
      const dateStr = "2025-01-15";
      const date = service.createDateWithTime(dateStr, 9, 0);

      // Get minutes from midnight
      const minutes = service.getMinutesFromMidnight(date);
      expect(minutes).toBe(540);

      // Convert back to time string
      const timeStr = service.minutesToTimeStr(minutes);
      expect(timeStr).toBe("09:00");

      // Format date
      const formatted = service.formatDate(date);
      expect(formatted).toBe(dateStr);
    });

    it("should handle shift spanning midnight", () => {
      const startDate = service.createDateWithTime("2025-01-15", 22, 0);
      const endDate = service.createDateWithTime("2025-01-16", 2, 0);

      const daysDiff = service.getDaysDifference(endDate, startDate);
      expect(daysDiff).toBe(1);

      const isAfter = service.isAfterDate(endDate, startDate);
      expect(isAfter).toBe(true);
    });

    it("should handle month boundary calculations", () => {
      const year = 2025;
      const month = 1;

      const daysInMonth = service.getDaysInMonth(year, month);
      const nextMonth = service.getNextMonthDay(year, month);
      const range = service.getDatesRange(year, month);

      expect(daysInMonth).toBe(31);
      expect(nextMonth.getMonth()).toBe(1); // February
      expect(range.startDate).toBe("2025-01-01");
      expect(range.endDate).toBe("2025-02-01");
    });

    it("should handle leap year calculations", () => {
      const leapYear = 2024;
      const nonLeapYear = 2025;

      const febLeap = service.getDaysInMonth(leapYear, 2);
      const febNonLeap = service.getDaysInMonth(nonLeapYear, 2);

      expect(febLeap).toBe(29);
      expect(febNonLeap).toBe(28);
    });

    it("should handle time arithmetic", () => {
      const baseDate = service.createDateWithTime("2025-01-15", 9, 0);

      // Add 5 days
      const futureDate = service.addDaysToDate(baseDate, 5);
      expect(futureDate.getDate()).toBe(20);

      // Subtract 3 days
      const pastDate = service.addDaysToDate(baseDate, -3);
      expect(pastDate.getDate()).toBe(12);

      // Both should maintain time
      expect(futureDate.getHours()).toBe(9);
      expect(pastDate.getHours()).toBe(9);
    });
  });

  describe("Edge Cases", () => {
    it("should handle leap year edge case (Feb 29)", () => {
      const date = service.createDateWithTime("2024-02-29", 10, 0);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29);
    });

    it("should handle year 2000 (leap year)", () => {
      const days = service.getDaysInMonth(2000, 2);

      expect(days).toBe(29);
    });

    it("should handle year 1900 (not a leap year)", () => {
      const days = service.getDaysInMonth(1900, 2);

      expect(days).toBe(28);
    });

    it("should handle very large minute values", () => {
      const result = service.minutesToTimeStr(10000);

      // 10000 % 1440 = 1360 minutes = 22:40
      expect(result).toBe("22:40");
    });

    it("should handle dates far in the future", () => {
      const date = service.createDateWithTime("2099-12-31", 23, 59);

      expect(date.getFullYear()).toBe(2099);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(31);
    });
  });
});
