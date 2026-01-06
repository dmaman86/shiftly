import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShiftService } from "@/domain/services/shift.service";
import { DateService } from "@/domain/services/date.service";
import type { Shift } from "@/domain/types/data-shapes";

describe("ShiftService", () => {
  let service: ShiftService;
  let dateService: DateService;

  beforeEach(() => {
    dateService = new DateService();
    service = new ShiftService(dateService);
  });

  // Helper function to create a shift
  const createShift = (
    startDate: Date,
    endDate: Date,
    isDuty: boolean = false
  ): Shift => ({
    id: "test-shift-1",
    start: { date: startDate },
    end: { date: endDate },
    isDuty,
  });

  describe("getMinutesFromMidnight", () => {
    it("should return 0 for midnight (00:00)", () => {
      const date = new Date(2025, 0, 15, 0, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(0);
    });

    it("should return 540 for 09:00", () => {
      const date = new Date(2025, 0, 15, 9, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(540);
    });

    it("should return 1020 for 17:00", () => {
      const date = new Date(2025, 0, 15, 17, 0, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(1020);
    });

    it("should handle minutes correctly (09:30)", () => {
      const date = new Date(2025, 0, 15, 9, 30, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(570); // 9*60 + 30
    });

    it("should return minutes from midnight when no reference date", () => {
      const date = new Date(2025, 0, 15, 10, 30, 0);
      const result = service.getMinutesFromMidnight(date);

      expect(result).toBe(630); // 10*60 + 30
    });

    it("should add 1440 minutes for next day with reference date", () => {
      const date = new Date(2025, 0, 16, 2, 0, 0);
      const referenceDate = new Date(2025, 0, 15, 22, 0, 0);
      const result = service.getMinutesFromMidnight(date, referenceDate);

      expect(result).toBe(120 + 1440); // 2*60 + 1440 = 1560
    });

    it("should add 2880 minutes for two days later", () => {
      const date = new Date(2025, 0, 17, 8, 0, 0);
      const referenceDate = new Date(2025, 0, 15, 22, 0, 0);
      const result = service.getMinutesFromMidnight(date, referenceDate);

      expect(result).toBe(480 + 2880); // 8*60 + 2*1440 = 3360
    });

    it("should handle same day with reference date", () => {
      const date = new Date(2025, 0, 15, 18, 0, 0);
      const referenceDate = new Date(2025, 0, 15, 9, 0, 0);
      const result = service.getMinutesFromMidnight(date, referenceDate);

      expect(result).toBe(1080); // 18*60 = 1080
    });

    it("should handle cross-day shift (22:00 to 02:00)", () => {
      const startDate = new Date(2025, 0, 15, 22, 0, 0);
      const endDate = new Date(2025, 0, 16, 2, 0, 0);

      const startMinutes = service.getMinutesFromMidnight(startDate);
      const endMinutes = service.getMinutesFromMidnight(endDate, startDate);

      expect(startMinutes).toBe(1320); // 22*60
      expect(endMinutes).toBe(1560); // 2*60 + 1440
    });
  });

  describe("getDurationShift", () => {
    it("should calculate duration for 8-hour shift (09:00 to 17:00)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(8);
    });

    it("should calculate duration for 4-hour shift (10:00 to 14:00)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 10, 0, 0),
        new Date(2025, 0, 15, 14, 0, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(4);
    });

    it("should calculate duration for 12-hour shift (08:00 to 20:00)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 15, 20, 0, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(12);
    });

    it("should calculate duration with half hours (09:00 to 13:30)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 13, 30, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(4.5);
    });

    it("should calculate duration for cross-day shift (22:00 to 06:00)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 16, 6, 0, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(8);
    });

    it("should calculate duration for night shift (23:00 to 07:00)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 23, 0, 0),
        new Date(2025, 0, 16, 7, 0, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(8);
    });

    it("should calculate duration for very short shift (30 minutes)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 10, 0, 0),
        new Date(2025, 0, 15, 10, 30, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(0.5);
    });

    it("should calculate duration for 24-hour shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 16, 8, 0, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(24);
    });

    it("should handle shifts with minutes (09:15 to 17:45)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 15, 0),
        new Date(2025, 0, 15, 17, 45, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(8.5); // 8 hours 30 minutes
    });

    it("should calculate fractional hours correctly", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 10, 0, 0),
        new Date(2025, 0, 15, 10, 15, 0)
      );

      const result = service.getDurationShift(shift);

      expect(result).toBe(0.25); // 15 minutes = 0.25 hours
    });
  });

  describe("isValidShiftDuration", () => {
    it("should return true for valid shift (end after start)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(true);
    });

    it("should return false for invalid shift (end before start)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 17, 0, 0),
        new Date(2025, 0, 15, 9, 0, 0)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(false);
    });

    it("should return false for zero duration shift (same time)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 9, 0, 0)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(false);
    });

    it("should return true for cross-day shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 16, 6, 0, 0)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(true);
    });

    it("should return true for shift lasting 1 second", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 9, 0, 1)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(true);
    });

    it("should return true for 24-hour shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 16, 8, 0, 0)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(true);
    });

    it("should validate very short shifts", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 10, 0, 0),
        new Date(2025, 0, 15, 10, 1, 0)
      );

      const result = service.isValidShiftDuration(shift);

      expect(result).toBe(true);
    });
  });

  describe("toggleNextDay", () => {
    it("should add one day when toNextDay is true", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const result = service.toggleNextDay(shift, true);

      expect(result.date.getDate()).toBe(16);
      expect(result.date.getMonth()).toBe(0);
      expect(result.date.getFullYear()).toBe(2025);
    });

    it("should subtract one day when toNextDay is false", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 16, 6, 0, 0)
      );

      const result = service.toggleNextDay(shift, false);

      expect(result.date.getDate()).toBe(15);
      expect(result.date.getMonth()).toBe(0);
      expect(result.date.getFullYear()).toBe(2025);
    });

    it("should maintain time when toggling", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 30, 0)
      );

      const result = service.toggleNextDay(shift, true);

      expect(result.date.getHours()).toBe(17);
      expect(result.date.getMinutes()).toBe(30);
    });

    it("should handle month boundaries when adding day", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 31, 17, 0, 0)
      );

      const result = service.toggleNextDay(shift, true);

      expect(result.date.getDate()).toBe(1);
      expect(result.date.getMonth()).toBe(1); // February
    });

    it("should handle month boundaries when subtracting day", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 1, 1, 17, 0, 0)
      );

      const result = service.toggleNextDay(shift, false);

      expect(result.date.getDate()).toBe(31);
      expect(result.date.getMonth()).toBe(0); // January
    });

    it("should handle year boundaries when adding day", () => {
      const shift = createShift(
        new Date(2024, 11, 15, 9, 0, 0),
        new Date(2024, 11, 31, 23, 0, 0)
      );

      const result = service.toggleNextDay(shift, true);

      expect(result.date.getFullYear()).toBe(2025);
      expect(result.date.getMonth()).toBe(0);
      expect(result.date.getDate()).toBe(1);
    });

    it("should handle year boundaries when subtracting day", () => {
      const shift = createShift(
        new Date(2024, 11, 15, 9, 0, 0),
        new Date(2025, 0, 1, 6, 0, 0)
      );

      const result = service.toggleNextDay(shift, false);

      expect(result.date.getFullYear()).toBe(2024);
      expect(result.date.getMonth()).toBe(11);
      expect(result.date.getDate()).toBe(31);
    });

    it("should return TimeFieldType with date property", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const result = service.toggleNextDay(shift, true);

      expect(result).toHaveProperty("date");
      expect(result.date).toBeInstanceOf(Date);
    });
  });

  describe("isCrossDay", () => {
    it("should return false for same-day shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(false);
    });

    it("should return true for cross-day shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 16, 6, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });

    it("should return true for night shift (23:00 to 07:00)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 23, 0, 0),
        new Date(2025, 0, 16, 7, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });

    it("should return false for shift ending at 23:59 same day", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 23, 59, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(false);
    });

    it("should return true for shift ending at 00:00 next day", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 16, 0, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });

    it("should return true for 24-hour shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 16, 8, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });

    it("should return true for shift spanning 2 days", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 17, 8, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });

    it("should handle month boundaries", () => {
      const shift = createShift(
        new Date(2025, 0, 31, 22, 0, 0),
        new Date(2025, 1, 1, 6, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });

    it("should handle year boundaries", () => {
      const shift = createShift(
        new Date(2024, 11, 31, 22, 0, 0),
        new Date(2025, 0, 1, 6, 0, 0)
      );

      const result = service.isCrossDay(shift);

      expect(result).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical day shift workflow", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      // Check if it's a cross-day shift
      const isCross = service.isCrossDay(shift);
      expect(isCross).toBe(false);

      // Validate duration
      const isValid = service.isValidShiftDuration(shift);
      expect(isValid).toBe(true);

      // Calculate duration
      const duration = service.getDurationShift(shift);
      expect(duration).toBe(8);
    });

    it("should handle typical night shift workflow", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 16, 6, 0, 0)
      );

      // Check if it's a cross-day shift
      const isCross = service.isCrossDay(shift);
      expect(isCross).toBe(true);

      // Validate duration
      const isValid = service.isValidShiftDuration(shift);
      expect(isValid).toBe(true);

      // Calculate duration
      const duration = service.getDurationShift(shift);
      expect(duration).toBe(8);
    });

    it("should handle toggling cross-day shift to same-day", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 16, 2, 0, 0)
      );

      // Initially cross-day
      expect(service.isCrossDay(shift)).toBe(true);

      // Toggle to same day
      const newEnd = service.toggleNextDay(shift, false);
      const newShift = { ...shift, end: newEnd };

      // Now same day
      expect(service.isCrossDay(newShift)).toBe(false);
    });

    it("should handle toggling same-day shift to cross-day", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 15, 23, 30, 0)
      );

      // Initially same day
      expect(service.isCrossDay(shift)).toBe(false);

      // Toggle to next day
      const newEnd = service.toggleNextDay(shift, true);
      const newShift = { ...shift, end: newEnd };

      // Now cross-day
      expect(service.isCrossDay(newShift)).toBe(true);
    });

    it("should calculate minutes correctly for complex cross-day shift", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 22, 30, 0),
        new Date(2025, 0, 16, 6, 45, 0)
      );

      const startMinutes = service.getMinutesFromMidnight(shift.start.date);
      const endMinutes = service.getMinutesFromMidnight(
        shift.end.date,
        shift.start.date
      );

      expect(startMinutes).toBe(1350); // 22*60 + 30
      expect(endMinutes).toBe(1845); // 6*60 + 45 + 1440

      const duration = service.getDurationShift(shift);
      expect(duration).toBe(8.25); // 8 hours 15 minutes
    });

    it("should handle full workflow with validation", () => {
      // Create a shift
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 15, 16, 30, 0)
      );

      // Validate it
      const isValid = service.isValidShiftDuration(shift);
      expect(isValid).toBe(true);

      // Check if cross-day
      const isCross = service.isCrossDay(shift);
      expect(isCross).toBe(false);

      // Calculate duration
      const duration = service.getDurationShift(shift);
      expect(duration).toBe(8.5);

      // Get minutes
      const startMinutes = service.getMinutesFromMidnight(shift.start.date);
      const endMinutes = service.getMinutesFromMidnight(shift.end.date);
      expect(startMinutes).toBe(480); // 8*60
      expect(endMinutes).toBe(990); // 16*60 + 30
    });
  });

  describe("Edge Cases", () => {
    it("should handle shift at exactly midnight", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 0, 0, 0),
        new Date(2025, 0, 15, 8, 0, 0)
      );

      const duration = service.getDurationShift(shift);
      const isCross = service.isCrossDay(shift);

      expect(duration).toBe(8);
      expect(isCross).toBe(false);
    });

    it("should handle shift ending at exactly midnight", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 16, 0, 0),
        new Date(2025, 0, 16, 0, 0, 0)
      );

      const duration = service.getDurationShift(shift);
      const isCross = service.isCrossDay(shift);

      expect(duration).toBe(8);
      expect(isCross).toBe(true);
    });

    it("should handle very long shift (48 hours)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 8, 0, 0),
        new Date(2025, 0, 17, 8, 0, 0)
      );

      const duration = service.getDurationShift(shift);
      const isCross = service.isCrossDay(shift);

      expect(duration).toBe(48);
      expect(isCross).toBe(true);
    });

    it("should handle shift with seconds precision", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 30),
        new Date(2025, 0, 15, 17, 0, 30)
      );

      const duration = service.getDurationShift(shift);

      expect(duration).toBe(8);
    });

    it("should handle leap year date", () => {
      const shift = createShift(
        new Date(2024, 1, 29, 9, 0, 0),
        new Date(2024, 1, 29, 17, 0, 0)
      );

      const isValid = service.isValidShiftDuration(shift);
      const isCross = service.isCrossDay(shift);

      expect(isValid).toBe(true);
      expect(isCross).toBe(false);
    });

    it("should handle year boundary cross-day shift", () => {
      const shift = createShift(
        new Date(2024, 11, 31, 23, 0, 0),
        new Date(2025, 0, 1, 7, 0, 0)
      );

      const duration = service.getDurationShift(shift);
      const isCross = service.isCrossDay(shift);

      expect(duration).toBe(8);
      expect(isCross).toBe(true);
    });

    it("should handle toggling at month boundary", () => {
      const shift = createShift(
        new Date(2025, 0, 31, 22, 0, 0),
        new Date(2025, 0, 31, 23, 0, 0)
      );

      const newEnd = service.toggleNextDay(shift, true);

      expect(newEnd.date.getMonth()).toBe(1); // February
      expect(newEnd.date.getDate()).toBe(1);
    });

    it("should handle very short shift (1 minute)", () => {
      const shift = createShift(
        new Date(2025, 0, 15, 10, 0, 0),
        new Date(2025, 0, 15, 10, 1, 0)
      );

      const duration = service.getDurationShift(shift);
      const isValid = service.isValidShiftDuration(shift);

      expect(duration).toBeCloseTo(0.0167, 4); // 1/60 hours
      expect(isValid).toBe(true);
    });
  });

  describe("Dependency on DateService", () => {
    it("should use DateService for getMinutesFromMidnight", () => {
      const mockDateService = {
        getMinutesFromMidnight: vi.fn(() => 540),
        getDaysDifference: vi.fn(() => 0),
        isAfterDate: vi.fn(),
        addDaysToDate: vi.fn(),
      } as any;

      const testService = new ShiftService(mockDateService);
      const date = new Date(2025, 0, 15, 9, 0, 0);

      testService.getMinutesFromMidnight(date);

      expect(mockDateService.getMinutesFromMidnight).toHaveBeenCalledWith(date);
    });

    it("should use DateService for getDaysDifference in getMinutesFromMidnight", () => {
      const mockDateService = {
        getMinutesFromMidnight: vi.fn(() => 120),
        getDaysDifference: vi.fn(() => 1),
        isAfterDate: vi.fn(),
        addDaysToDate: vi.fn(),
      } as any;

      const testService = new ShiftService(mockDateService);
      const date = new Date(2025, 0, 16, 2, 0, 0);
      const reference = new Date(2025, 0, 15, 22, 0, 0);

      const result = testService.getMinutesFromMidnight(date, reference);

      expect(mockDateService.getDaysDifference).toHaveBeenCalledWith(
        date,
        reference
      );
      expect(result).toBe(1560); // 120 + 1*1440
    });

    it("should use DateService for isAfterDate validation", () => {
      const mockDateService = {
        getMinutesFromMidnight: vi.fn(),
        getDaysDifference: vi.fn(),
        isAfterDate: vi.fn(() => true),
        addDaysToDate: vi.fn(),
      } as any;

      const testService = new ShiftService(mockDateService);
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      testService.isValidShiftDuration(shift);

      expect(mockDateService.isAfterDate).toHaveBeenCalledWith(
        shift.end.date,
        shift.start.date
      );
    });

    it("should use DateService for addDaysToDate in toggleNextDay", () => {
      const newDate = new Date(2025, 0, 16, 17, 0, 0);
      const mockDateService = {
        getMinutesFromMidnight: vi.fn(),
        getDaysDifference: vi.fn(),
        isAfterDate: vi.fn(),
        addDaysToDate: vi.fn(() => newDate),
      } as any;

      const testService = new ShiftService(mockDateService);
      const shift = createShift(
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const result = testService.toggleNextDay(shift, true);

      expect(mockDateService.addDaysToDate).toHaveBeenCalledWith(
        shift.end.date,
        1
      );
      expect(result.date).toBe(newDate);
    });

    it("should use DateService for getDaysDifference in isCrossDay", () => {
      const mockDateService = {
        getMinutesFromMidnight: vi.fn(),
        getDaysDifference: vi.fn(() => 1),
        isAfterDate: vi.fn(),
        addDaysToDate: vi.fn(),
      } as any;

      const testService = new ShiftService(mockDateService);
      const shift = createShift(
        new Date(2025, 0, 15, 22, 0, 0),
        new Date(2025, 0, 16, 6, 0, 0)
      );

      const result = testService.isCrossDay(shift);

      expect(mockDateService.getDaysDifference).toHaveBeenCalledWith(
        shift.end.date,
        shift.start.date
      );
      expect(result).toBe(true);
    });
  });
});
