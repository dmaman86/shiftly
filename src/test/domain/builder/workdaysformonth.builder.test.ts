import { describe, it, expect, beforeEach, vi } from "vitest";
import { DefaultWorkDaysForMonthBuilder } from "@/domain/builder/workdaysformonth.builder";
import { HolidayResolverService } from "@/domain/resolve/holiday.resolver";
import { WorkDayInfoResolver } from "@/domain/resolve/workdayinfo.resolver";
import { DateService } from "@/domain/services/date.service";
import { WorkDayType } from "@/constants/fields.constant";

describe("DefaultWorkDaysForMonthBuilder", () => {
  let builder: DefaultWorkDaysForMonthBuilder;
  let holidayResolver: HolidayResolverService;
  let workDayInfoResolver: WorkDayInfoResolver;
  let dateService: DateService;

  beforeEach(() => {
    dateService = new DateService();
    holidayResolver = new HolidayResolverService();
    workDayInfoResolver = new WorkDayInfoResolver();
    
    builder = new DefaultWorkDaysForMonthBuilder(
      holidayResolver,
      workDayInfoResolver,
      dateService
    );
  });

  describe("build - Basic functionality", () => {
    it("should build array of WorkDayInfo for given month", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(31); // January has 31 days
    });

    it("should create correct number of days for February (non-leap year)", () => {
      const result = builder.build({
        year: 2023,
        month: 2,
        eventMap: {},
      });

      expect(result.length).toBe(28);
    });

    it("should create correct number of days for February (leap year)", () => {
      const result = builder.build({
        year: 2024,
        month: 2,
        eventMap: {},
      });

      expect(result.length).toBe(29);
    });

    it("should create correct number of days for April (30 days)", () => {
      const result = builder.build({
        year: 2024,
        month: 4,
        eventMap: {},
      });

      expect(result.length).toBe(30);
    });

    it("should create correct number of days for December", () => {
      const result = builder.build({
        year: 2024,
        month: 12,
        eventMap: {},
      });

      expect(result.length).toBe(31);
    });
  });

  describe("build - WorkDayInfo structure", () => {
    it("should create WorkDayInfo objects with correct structure", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      result.forEach((workDay) => {
        expect(workDay).toHaveProperty("meta");
        expect(workDay).toHaveProperty("hebrewDay");
        expect(workDay.meta).toHaveProperty("date");
        expect(workDay.meta).toHaveProperty("typeDay");
        expect(workDay.meta).toHaveProperty("crossDayContinuation");
      });
    });

    it("should format dates correctly (YYYY-MM-DD)", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      expect(result[0].meta.date).toBe("2024-01-01");
      expect(result[14].meta.date).toBe("2024-01-15");
      expect(result[30].meta.date).toBe("2024-01-31");
    });

    it("should assign correct Hebrew day names", () => {
      const result = builder.build({
        year: 2024,
        month: 1, // January 2024 starts on Monday
        eventMap: {},
      });

      // January 1, 2024 is Monday (day 1)
      expect(result[0].hebrewDay).toBe("ב"); // Monday
      
      // January 6, 2024 is Saturday (day 6)
      expect(result[5].hebrewDay).toBe("ש"); // Saturday
      
      // January 7, 2024 is Sunday (day 0)
      expect(result[6].hebrewDay).toBe("א"); // Sunday
    });

    it("should have all Hebrew day letters א-ש", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      const hebrewDays = result.map((d) => d.hebrewDay);
      const uniqueDays = new Set(hebrewDays);
      
      // Should have all 7 unique Hebrew days
      expect(uniqueDays.size).toBe(7);
      expect(uniqueDays.has("א")).toBe(true); // Sunday
      expect(uniqueDays.has("ב")).toBe(true); // Monday
      expect(uniqueDays.has("ש")).toBe(true); // Saturday
    });
  });

  describe("build - WorkDayType assignment", () => {
    it("should mark Saturday as SpecialFull", () => {
      const result = builder.build({
        year: 2024,
        month: 1, // January 6, 13, 20, 27 are Saturdays
        eventMap: {},
      });

      // January 6, 2024 is Saturday
      expect(result[5].meta.typeDay).toBe(WorkDayType.SpecialFull);
      
      // January 13, 2024 is Saturday
      expect(result[12].meta.typeDay).toBe(WorkDayType.SpecialFull);
    });

    it("should mark Friday as SpecialPartialStart", () => {
      const result = builder.build({
        year: 2024,
        month: 1, // January 5, 12, 19, 26 are Fridays
        eventMap: {},
      });

      // January 5, 2024 is Friday
      expect(result[4].meta.typeDay).toBe(WorkDayType.SpecialPartialStart);
      
      // January 12, 2024 is Friday
      expect(result[11].meta.typeDay).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should mark regular weekdays as Regular", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // January 1, 2024 is Monday - Regular
      expect(result[0].meta.typeDay).toBe(WorkDayType.Regular);
      
      // January 2, 2024 is Tuesday - Regular
      expect(result[1].meta.typeDay).toBe(WorkDayType.Regular);
      
      // January 3, 2024 is Wednesday - Regular
      expect(result[2].meta.typeDay).toBe(WorkDayType.Regular);
    });

    it("should mark paid holidays as SpecialFull", () => {
      const eventMap = {
        "2024-01-15": ["Rosh Hashana"],
      };

      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap,
      });

      expect(result[14].meta.typeDay).toBe(WorkDayType.SpecialFull);
    });

    it("should mark Erev holidays as SpecialPartialStart", () => {
      const eventMap = {
        "2024-01-15": ["Erev Pesach"],
      };

      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap,
      });

      expect(result[14].meta.typeDay).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should handle multiple holidays on same day", () => {
      const eventMap = {
        "2024-01-15": ["Rosh Hashana", "Some other event"],
      };

      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap,
      });

      expect(result[14].meta.typeDay).toBe(WorkDayType.SpecialFull);
    });
  });

  describe("build - crossDayContinuation flag", () => {
    it("should set crossDayContinuation to true for Friday before Saturday", () => {
      const result = builder.build({
        year: 2024,
        month: 1, // January 5 is Friday, 6 is Saturday
        eventMap: {},
      });

      // January 5 (Friday) should have crossDayContinuation=true
      expect(result[4].meta.crossDayContinuation).toBe(true);
    });

    it("should set crossDayContinuation to false for other days", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // Monday-Thursday should be false
      expect(result[0].meta.crossDayContinuation).toBe(false); // Monday
      expect(result[1].meta.crossDayContinuation).toBe(false); // Tuesday
      expect(result[2].meta.crossDayContinuation).toBe(false); // Wednesday
      expect(result[3].meta.crossDayContinuation).toBe(false); // Thursday
    });

    it("should set crossDayContinuation for day before paid holiday", () => {
      const eventMap = {
        "2024-01-16": ["Rosh Hashana"], // Tuesday
      };

      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap,
      });

      // January 15 (Monday) should have crossDayContinuation=true
      expect(result[14].meta.crossDayContinuation).toBe(true);
    });

    it("should set crossDayContinuation for last day if next month starts with SpecialFull", () => {
      const eventMap = {
        "2024-02-01": ["Rosh Hashana"], // First day of February is holiday
      };

      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap,
      });

      // January 31 should have crossDayContinuation=true
      expect(result[30].meta.crossDayContinuation).toBe(true);
    });

    it("should not set crossDayContinuation for last day if next month starts regularly", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // January 31, 2024 is Wednesday, February 1 is Thursday (regular)
      // Should check if it's false unless Feb 1 is a Saturday
      const lastDay = result[result.length - 1];
      
      // February 1, 2024 is Thursday, so crossDayContinuation should be false
      expect(lastDay.meta.crossDayContinuation).toBe(false);
    });

    it("should handle crossDayContinuation for end of December", () => {
      const eventMap = {
        "2025-01-01": ["Rosh Hashana"], // Next year
      };

      const result = builder.build({
        year: 2024,
        month: 12,
        eventMap,
      });

      // December 31 should have crossDayContinuation=true
      expect(result[30].meta.crossDayContinuation).toBe(true);
    });
  });

  describe("build - Integration with dependencies", () => {
    it("should call holidayResolver.resolve for each day", () => {
      const resolveSpy = vi.spyOn(holidayResolver, "resolve");

      builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // Should be called 31 times for January + 1 time for next month
      expect(resolveSpy).toHaveBeenCalled();
      expect(resolveSpy.mock.calls.length).toBeGreaterThanOrEqual(31);
    });

    it("should call dateService.getDaysInMonth", () => {
      const getDaysSpy = vi.spyOn(dateService, "getDaysInMonth");

      builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      expect(getDaysSpy).toHaveBeenCalledWith(2024, 1);
    });

    it("should call dateService.formatDate for each day", () => {
      const formatSpy = vi.spyOn(dateService, "formatDate");

      builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // Should be called at least 31 times for January + next month
      expect(formatSpy.mock.calls.length).toBeGreaterThanOrEqual(31);
    });

    it("should call dateService.getNextMonthDay", () => {
      const getNextSpy = vi.spyOn(dateService, "getNextMonthDay");

      builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      expect(getNextSpy).toHaveBeenCalledWith(2024, 1);
    });

    it("should call workDayInfoResolver.isSpecialFullDay for crossDayContinuation logic", () => {
      const isSpecialSpy = vi.spyOn(workDayInfoResolver, "isSpecialFullDay");

      builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // Should be called for each day except the first
      expect(isSpecialSpy.mock.calls.length).toBeGreaterThanOrEqual(30);
    });
  });

  describe("build - Edge cases", () => {
    it("should handle month with 28 days correctly", () => {
      const result = builder.build({
        year: 2023,
        month: 2,
        eventMap: {},
      });

      expect(result.length).toBe(28);
      expect(result[0].meta.date).toBe("2023-02-01");
      expect(result[27].meta.date).toBe("2023-02-28");
    });

    it("should handle leap year February correctly", () => {
      const result = builder.build({
        year: 2024,
        month: 2,
        eventMap: {},
      });

      expect(result.length).toBe(29);
      expect(result[28].meta.date).toBe("2024-02-29");
    });

    it("should handle December to January transition", () => {
      const eventMap = {
        "2025-01-01": ["Some Event"],
      };

      const result = builder.build({
        year: 2024,
        month: 12,
        eventMap,
      });

      expect(result.length).toBe(31);
      expect(result[30].meta.date).toBe("2024-12-31");
    });

    it("should handle empty eventMap", () => {
      const result = builder.build({
        year: 2024,
        month: 6,
        eventMap: {},
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(30);
      
      // All days should still have proper typeDay based on weekday
      result.forEach((day) => {
        expect(day.meta.typeDay).toBeDefined();
      });
    });

    it("should handle eventMap with dates outside the month", () => {
      const eventMap = {
        "2024-02-15": ["Some Event"], // Different month
        "2024-01-15": ["Rosh Hashana"],
      };

      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap,
      });

      // Should only apply events from January
      expect(result[14].meta.typeDay).toBe(WorkDayType.SpecialFull);
    });

    it("should handle single-day month edge case", () => {
      // While not realistic, test the builder can handle it
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      expect(result[0]).toBeDefined();
      expect(result[0].meta.date).toBe("2024-01-01");
    });
  });

  describe("build - Realistic month scenarios", () => {
    it("should handle typical January with Fridays and Saturdays", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // Count Fridays (SpecialPartialStart)
      const fridays = result.filter(
        (d) => d.meta.typeDay === WorkDayType.SpecialPartialStart
      );
      
      // Count Saturdays (SpecialFull)
      const saturdays = result.filter(
        (d) => d.meta.typeDay === WorkDayType.SpecialFull
      );

      expect(fridays.length).toBeGreaterThan(0);
      expect(saturdays.length).toBeGreaterThan(0);
    });

    it("should handle month with holidays", () => {
      const eventMap = {
        "2024-09-14": ["Rosh Hashana"],
        "2024-09-15": ["Rosh Hashana II"],
        "2024-09-13": ["Erev Rosh Hashana"],
      };

      const result = builder.build({
        year: 2024,
        month: 9,
        eventMap,
      });

      const holidays = result.filter(
        (d) => d.meta.typeDay === WorkDayType.SpecialFull
      );

      // Should have at least the paid holidays + Saturdays
      expect(holidays.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle Passover month with multiple special days", () => {
      const eventMap = {
        "2024-04-22": ["Erev Pesach"],
        "2024-04-23": ["Pesach I"],
        "2024-04-24": ["Pesach II"],
        "2024-04-25": ["Pesach III (CH''M)"],
      };

      const result = builder.build({
        year: 2024,
        month: 4,
        eventMap,
      });

      // Check Erev Pesach is SpecialPartialStart
      const erevPesach = result.find((d) => d.meta.date === "2024-04-22");
      expect(erevPesach?.meta.typeDay).toBe(WorkDayType.SpecialPartialStart);

      // Check Pesach I is SpecialFull
      const pesachI = result.find((d) => d.meta.date === "2024-04-23");
      expect(pesachI?.meta.typeDay).toBe(WorkDayType.SpecialFull);
    });

    it("should handle month starting on Saturday", () => {
      // Find a month that starts on Saturday
      const result = builder.build({
        year: 2024,
        month: 6, // June 2024 starts on Saturday
        eventMap: {},
      });

      expect(result[0].meta.typeDay).toBe(WorkDayType.SpecialFull);
      expect(result[0].hebrewDay).toBe("ש");
    });

    it("should handle month starting on Friday", () => {
      const result = builder.build({
        year: 2024,
        month: 3, // March 2024 starts on Friday
        eventMap: {},
      });

      expect(result[0].meta.typeDay).toBe(WorkDayType.SpecialPartialStart);
      expect(result[0].hebrewDay).toBe("ו");
    });

    it("should handle sequential crossDayContinuation (Friday-Saturday)", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      // Find Fridays and check crossDayContinuation
      result.forEach((day, index) => {
        if (day.meta.typeDay === WorkDayType.SpecialPartialStart && index < result.length - 1) {
          const nextDay = result[index + 1];
          if (nextDay.meta.typeDay === WorkDayType.SpecialFull) {
            expect(day.meta.crossDayContinuation).toBe(true);
          }
        }
      });
    });
  });

  describe("build - Data consistency", () => {
    it("should have dates in sequential order", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].meta.date);
        const currDate = new Date(result[i].meta.date);
        
        const diffInDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffInDays).toBe(1);
      }
    });

    it("should have no duplicate dates", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      const dates = result.map((d) => d.meta.date);
      const uniqueDates = new Set(dates);
      
      expect(uniqueDates.size).toBe(dates.length);
    });

    it("should have all days with valid WorkDayType", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      const validTypes = [
        WorkDayType.Regular,
        WorkDayType.SpecialPartialStart,
        WorkDayType.SpecialFull,
      ];

      result.forEach((day) => {
        expect(validTypes).toContain(day.meta.typeDay);
      });
    });

    it("should have all days with boolean crossDayContinuation", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      result.forEach((day) => {
        expect(typeof day.meta.crossDayContinuation).toBe("boolean");
      });
    });

    it("should have all days with non-empty hebrewDay", () => {
      const result = builder.build({
        year: 2024,
        month: 1,
        eventMap: {},
      });

      result.forEach((day) => {
        expect(day.hebrewDay).toBeTruthy();
        expect(day.hebrewDay.length).toBe(1);
      });
    });
  });

  describe("build - Different years", () => {
    it("should handle year 2023", () => {
      const result = builder.build({
        year: 2023,
        month: 1,
        eventMap: {},
      });

      expect(result.length).toBe(31);
      expect(result[0].meta.date).toBe("2023-01-01");
    });

    it("should handle year 2025", () => {
      const result = builder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      expect(result.length).toBe(31);
      expect(result[0].meta.date).toBe("2025-01-01");
    });

    it("should handle leap year vs non-leap year February", () => {
      const leap = builder.build({
        year: 2024,
        month: 2,
        eventMap: {},
      });

      const nonLeap = builder.build({
        year: 2023,
        month: 2,
        eventMap: {},
      });

      expect(leap.length).toBe(29);
      expect(nonLeap.length).toBe(28);
    });
  });

  describe("build - All months of the year", () => {
    it("should handle all 12 months correctly", () => {
      const monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 2024 leap year

      for (let month = 1; month <= 12; month++) {
        const result = builder.build({
          year: 2024,
          month,
          eventMap: {},
        });

        expect(result.length).toBe(monthDays[month - 1]);
      }
    });
  });
});
