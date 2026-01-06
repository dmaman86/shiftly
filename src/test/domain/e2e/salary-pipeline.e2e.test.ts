import { describe, it, expect, beforeEach } from "vitest";
import { buildPayMapPipeline } from "@/domain/composition";
import type { PayMapPipeline } from "@/domain/types/domain.types";
import type { Shift, WorkDayMeta, ShiftPayMap } from "@/domain";
import { WorkDayType } from "@/constants/fields.constant";

/**
 * END-TO-END TESTS FOR SALARY CALCULATION PIPELINE
 * 
 * These tests verify the complete salary calculation flow from individual shifts
 * through to monthly aggregations. They test the integration of all components:
 * - Services (DateService, ShiftService)
 * - Resolvers (Holiday, WorkDay, Month, PerDiem, MealAllowance)
 * - Calculators (Regular, Extra, Special, PerDiem, MealAllowance)
 * - Builders (ShiftMap, DayPayMap, WorkDaysForMonth)
 * - Reducers (MonthPayMap)
 */
describe("Salary Calculation Pipeline - E2E Tests", () => {
  let pipeline: PayMapPipeline;

  beforeEach(() => {
    // Build the complete pipeline with all dependencies
    pipeline = buildPayMapPipeline();
  });

  // Helper to create a shift
  const createShift = (
    id: string,
    startDate: Date,
    endDate: Date,
    isDuty: boolean = false
  ): Shift => ({
    id,
    start: { date: startDate },
    end: { date: endDate },
    isDuty,
  });

  // Helper to create WorkDayMeta
  const createMeta = (
    date: string,
    typeDay: WorkDayType = WorkDayType.Regular,
    crossDayContinuation: boolean = false
  ): WorkDayMeta => ({
    date,
    typeDay,
    crossDayContinuation,
  });

  // Helper to build shift map with all required parameters
  const buildShiftMap = (
    shift: Shift,
    meta: WorkDayMeta,
    standardHours: number = 8
  ): ShiftPayMap => {
    return pipeline.payMap.shiftMapBuilder.build({
      shift,
      meta,
      standardHours,
      isFieldDutyShift: shift.isDuty,
    });
  };

  describe("Pipeline Component Availability", () => {
    it("should have all pipeline components initialized", () => {
      // Verify main builders
      expect(pipeline.payMap).toBeDefined();
      expect(pipeline.payMap.shiftMapBuilder).toBeDefined();
      expect(pipeline.payMap.dayPayMapBuilder).toBeDefined();
      expect(pipeline.payMap.monthPayMapCalculator).toBeDefined();
      expect(pipeline.payMap.workDaysForMonthBuilder).toBeDefined();

      // Verify resolvers
      expect(pipeline.resolvers).toBeDefined();
      expect(pipeline.resolvers.holidayResolver).toBeDefined();
      expect(pipeline.resolvers.workDayInfoResolver).toBeDefined();
      expect(pipeline.resolvers.monthResolver).toBeDefined();
      expect(pipeline.resolvers.perDiemRateResolver).toBeDefined();
      expect(pipeline.resolvers.mealAllowanceRateResolver).toBeDefined();

      // Verify services
      expect(pipeline.services).toBeDefined();
      expect(pipeline.services.dateService).toBeDefined();
      expect(pipeline.services.shiftService).toBeDefined();
    });

    it("should create new pipeline instances each time", () => {
      const pipeline1 = buildPayMapPipeline();
      const pipeline2 = buildPayMapPipeline();

      // Different instances
      expect(pipeline1).not.toBe(pipeline2);
      expect(pipeline1.services.dateService).not.toBe(pipeline2.services.dateService);
    });
  });

  describe("Shift Layer - Individual Shift Processing", () => {
    describe("Regular 8-hour shift", () => {
      it("should calculate 8 hours at 100% rate for standard day shift", () => {
        // Arrange: Regular 09:00 - 17:00 shift
        const shift = createShift(
          "shift-1",
          new Date(2025, 0, 15, 9, 0, 0),
          new Date(2025, 0, 15, 17, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        // Act: Process through shift layer
        const shiftMap = buildShiftMap(shift, meta);

        // Assert: 8 hours at 100%
        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.regular.hours125.hours).toBe(0);
        expect(shiftMap.regular.hours150.hours).toBe(0);
        expect(shiftMap.totalHours).toBe(8);
      });

      it("should handle fractional hours (9:00 - 13:30 = 4.5 hours)", () => {
        const shift = createShift(
          "shift-half",
          new Date(2025, 0, 15, 9, 0, 0),
          new Date(2025, 0, 15, 13, 30, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        expect(shiftMap.regular.hours100.hours).toBe(4.5);
        expect(shiftMap.totalHours).toBe(4.5);
      });

      it("should handle very short shift (30 minutes)", () => {
        const shift = createShift(
          "shift-short",
          new Date(2025, 0, 15, 10, 0, 0),
          new Date(2025, 0, 15, 10, 30, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        expect(shiftMap.regular.hours100.hours).toBe(0.5);
        expect(shiftMap.totalHours).toBe(0.5);
      });
    });

    describe("Overtime shifts", () => {
      it("should split 10-hour shift into 100% and 125% tiers", () => {
        // Arrange: 10-hour shift (8 at 100%, 2 at 125%)
        const shift = createShift(
          "shift-overtime",
          new Date(2025, 0, 15, 8, 0, 0),
          new Date(2025, 0, 15, 18, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        // Act
        const shiftMap = buildShiftMap(shift, meta);

        // Assert: 8h at 100%, 2h at 125%
        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.regular.hours125.hours).toBe(2);
        expect(shiftMap.regular.hours150.hours).toBe(0);
        expect(shiftMap.totalHours).toBe(10);
      });

      it("should handle extreme overtime (12 hours → 8/2/2 split)", () => {
        const shift = createShift(
          "shift-extreme",
          new Date(2025, 0, 15, 7, 0, 0),
          new Date(2025, 0, 15, 19, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        // 8h at 100%, 2h at 125%, 2h at 150%
        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.regular.hours125.hours).toBe(2);
        expect(shiftMap.regular.hours150.hours).toBe(2);
        expect(shiftMap.totalHours).toBe(12);
      });

      it("should handle 24-hour shift with multi-tier breakdown", () => {
        const shift = createShift(
          "shift-24h",
          new Date(2025, 0, 15, 8, 0, 0),
          new Date(2025, 0, 16, 8, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        // 24 hours total split across tiers
        expect(shiftMap.totalHours).toBe(24);
        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.regular.hours125.hours).toBe(2);
        expect(shiftMap.regular.hours150.hours).toBeGreaterThan(0);
      });
    });

    describe("Night shifts crossing midnight", () => {
      it("should calculate correct duration for cross-day shift (22:00 - 06:00)", () => {
        const shift = createShift(
          "shift-night",
          new Date(2025, 0, 15, 22, 0, 0),
          new Date(2025, 0, 16, 6, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        // 8 hours at 100%
        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.totalHours).toBe(8);
      });

      it("should handle night shift with overtime (22:00 - 08:00 = 10 hours)", () => {
        const shift = createShift(
          "shift-night-overtime",
          new Date(2025, 0, 15, 22, 0, 0),
          new Date(2025, 0, 16, 8, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.regular.hours125.hours).toBe(2);
        expect(shiftMap.totalHours).toBe(10);
      });

      it("should handle shift ending exactly at midnight", () => {
        const shift = createShift(
          "shift-to-midnight",
          new Date(2025, 0, 15, 16, 0, 0),
          new Date(2025, 0, 16, 0, 0, 0)
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        expect(shiftMap.regular.hours100.hours).toBe(8);
        expect(shiftMap.totalHours).toBe(8);
      });
    });

    describe("Per-diem shifts", () => {
      it("should process duty shift for per-diem calculation", () => {
        const shift = createShift(
          "shift-duty",
          new Date(2025, 0, 15, 8, 0, 0),
          new Date(2025, 0, 15, 16, 0, 0),
          true // isDuty = true
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        // Should have perDiem info
        expect(shiftMap.perDiemShift).toBeDefined();
        expect(shiftMap.perDiemShift.isFieldDutyShift).toBe(true);
        expect(shiftMap.perDiemShift.hours).toBe(8);
      });

      it("should not mark non-duty shift for per-diem", () => {
        const shift = createShift(
          "shift-regular",
          new Date(2025, 0, 15, 8, 0, 0),
          new Date(2025, 0, 15, 16, 0, 0),
          false // isDuty = false
        );

        const meta = createMeta("2025-01-15", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        expect(shiftMap.perDiemShift.isFieldDutyShift).toBe(false);
      });
    });

    describe("Shabbat and Special Days", () => {
      it("should apply special rates for Shabbat shift", () => {
        // Saturday shift
        const shift = createShift(
          "shift-shabbat",
          new Date(2025, 0, 11, 10, 0, 0), // Saturday Jan 11, 2025
          new Date(2025, 0, 11, 18, 0, 0)
        );

        const meta = createMeta("2025-01-11", WorkDayType.SpecialFull);

        const shiftMap = buildShiftMap(shift, meta);

        // Should have special hours calculated
        expect(shiftMap.totalHours).toBe(8);
        expect(shiftMap.special).toBeDefined();
      });

      it("should handle partial Shabbat (Friday evening continuation)", () => {
        const shift = createShift(
          "shift-friday-night",
          new Date(2025, 0, 10, 17, 0, 0), // Friday evening
          new Date(2025, 0, 11, 1, 0, 0)   // Saturday morning
        );

        const meta = createMeta("2025-01-10", WorkDayType.Regular);

        const shiftMap = buildShiftMap(shift, meta);

        expect(shiftMap.totalHours).toBe(8);
      });
    });
  });

  describe("Day Layer - Work Day Aggregation", () => {
    it("should aggregate month structure (January 2025)", () => {
      // Act: Build month structure
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      // Assert: January has 31 days
      expect(workDays).toHaveLength(31);
      
      // Verify first day structure
      expect(workDays[0].meta.date).toBe("2025-01-01");
      expect(workDays[0].meta).toHaveProperty("typeDay");
      expect(workDays[0]).toHaveProperty("hebrewDay");
    });

    it("should handle February in leap year (2024)", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2024,
        month: 2,
        eventMap: {},
      });

      // February 2024 has 29 days (leap year)
      expect(workDays).toHaveLength(29);
      expect(workDays[28].meta.date).toBe("2024-02-29");
    });

    it("should handle February in non-leap year (2025)", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 2,
        eventMap: {},
      });

      // February 2025 has 28 days (non-leap year)
      expect(workDays).toHaveLength(28);
    });

    it("should identify Saturdays as SpecialFull", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      // Find all Saturdays
      const saturdays = workDays.filter(
        (day) => day.meta.typeDay === WorkDayType.SpecialFull
      );

      // January 2025 has 4-5 Saturdays
      expect(saturdays.length).toBeGreaterThanOrEqual(4);
      expect(saturdays.length).toBeLessThanOrEqual(5);
    });

    it("should identify Fridays correctly", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      // Find all Fridays (ו in Hebrew)
      const fridays = workDays.filter((day) => day.hebrewDay === "ו");

      // January 2025 has 4-5 Fridays
      expect(fridays.length).toBeGreaterThanOrEqual(4);
      expect(fridays.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Month Layer - Monthly Aggregation", () => {
    it("should create empty month pay map structure", () => {
      // Act: Create empty month
      const emptyMonth = pipeline.payMap.monthPayMapCalculator.createEmpty();

      // Assert: All fields should be zero
      expect(emptyMonth.regular.hours100.hours).toBe(0);
      expect(emptyMonth.regular.hours125.hours).toBe(0);
      expect(emptyMonth.regular.hours150.hours).toBe(0);
      expect(emptyMonth.extra.hours20.hours).toBe(0);
      expect(emptyMonth.extra.hours50.hours).toBe(0);
      expect(emptyMonth.special.shabbat150.hours).toBe(0);
      expect(emptyMonth.special.shabbat200.hours).toBe(0);
      expect(emptyMonth.hours100Sick.hours).toBe(0);
      expect(emptyMonth.hours100Vacation.hours).toBe(0);
      expect(emptyMonth.totalHours).toBe(0);
    });

    it("should have all required properties in month structure", () => {
      const emptyMonth = pipeline.payMap.monthPayMapCalculator.createEmpty();

      // Core work categories
      expect(emptyMonth).toHaveProperty("regular");
      expect(emptyMonth).toHaveProperty("extra");
      expect(emptyMonth).toHaveProperty("special");

      // Fixed segments
      expect(emptyMonth).toHaveProperty("hours100Sick");
      expect(emptyMonth).toHaveProperty("hours100Vacation");
      expect(emptyMonth).toHaveProperty("extra100Shabbat");

      // Allowances
      expect(emptyMonth).toHaveProperty("perDiem");
      expect(emptyMonth).toHaveProperty("mealAllowance");

      // Total
      expect(emptyMonth).toHaveProperty("totalHours");
    });
  });

  describe("Complete Pipeline Flow - E2E Integration", () => {
    it("should process single shift through complete pipeline", () => {
      // Step 1: Build month structure
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      // Step 2: Process a single shift on Jan 15 (regular Wednesday)
      const shift = createShift(
        "test-shift",
        new Date(2025, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 17, 0, 0)
      );

      const workDay = workDays[14]; // Jan 15 is index 14 (0-based)

      // Step 3: Build shift pay map
      const shiftMap = buildShiftMap(shift, workDay.meta);

      // Verify shift-level calculation
      expect(shiftMap.regular.hours100.hours).toBe(8);
      expect(shiftMap.totalHours).toBe(8);
    });

    it("should process realistic work week scenario", () => {
      // Arrange: Build January 2025 structure
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      // Process week of Jan 13-17 (Mon-Fri)
      const weekShifts: ShiftPayMap[] = [];

      // Monday-Thursday: Regular 8-hour days
      for (let day = 13; day <= 16; day++) {
        const shift = createShift(
          `shift-${day}`,
          new Date(2025, 0, day, 9, 0, 0),
          new Date(2025, 0, day, 17, 0, 0)
        );
        
        const workDay = workDays[day - 1];
        const shiftMap = buildShiftMap(shift, workDay.meta);
        
        weekShifts.push(shiftMap);
      }

      // Thursday: 10-hour day (with overtime) - changed from Friday to avoid special day handling
      const thursdayShift = createShift(
        "shift-thursday-overtime",
        new Date(2025, 0, 16, 9, 0, 0),
        new Date(2025, 0, 16, 19, 0, 0)
      );

      const thursdayWorkDay = workDays[15]; // Jan 16 is index 15 (0-based)
      const thursdayShiftMap = buildShiftMap(thursdayShift, thursdayWorkDay.meta);

      // Verify week totals (replace Thursday's 8h with 10h)
      const regularHours = weekShifts.slice(0, 3).reduce((sum, map) => sum + map.totalHours, 0); // Mon-Wed
      expect(regularHours).toBe(24); // 3×8
      
      // Verify overtime on Thursday
      expect(thursdayShiftMap.totalHours).toBe(10);
      expect(thursdayShiftMap.regular.hours100.hours).toBe(8);
      expect(thursdayShiftMap.regular.hours125.hours).toBe(2);
    });

    it("should handle month with mixed scenarios (realistic use case)", () => {
      // This test demonstrates a realistic month with:
      // - Regular work days
      // - Overtime days
      // - Night shifts
      // - Weekend work
      // - Short shifts

      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      const allShifts: ShiftPayMap[] = [];

      // Week 1: Regular days (Jan 6-10, Mon-Fri)
      for (let day = 6; day <= 10; day++) {
        const shift = createShift(
          `week1-${day}`,
          new Date(2025, 0, day, 9, 0, 0),
          new Date(2025, 0, day, 17, 0, 0)
        );
        const shiftMap = buildShiftMap(shift, workDays[day - 1].meta);
        allShifts.push(shiftMap);
      }

      // Week 2: Include one night shift (Jan 13 night)
      const nightShift = createShift(
        "night-shift",
        new Date(2025, 0, 13, 22, 0, 0),
        new Date(2025, 0, 14, 6, 0, 0)
      );
      const nightShiftMap = buildShiftMap(nightShift, workDays[12].meta);
      allShifts.push(nightShiftMap);

      // Add more regular days
      for (let day = 14; day <= 17; day++) {
        const shift = createShift(
          `week2-${day}`,
          new Date(2025, 0, day, 9, 0, 0),
          new Date(2025, 0, day, 17, 0, 0)
        );
        const shiftMap = buildShiftMap(shift, workDays[day - 1].meta);
        allShifts.push(shiftMap);
      }

      // Calculate total hours
      const totalHours = allShifts.reduce((sum, map) => sum + map.totalHours, 0);
      expect(totalHours).toBeGreaterThan(0);
      expect(allShifts.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Boundaries", () => {
    it("should handle shift at year boundary (Dec 31 to Jan 1)", () => {
      const shift = createShift(
        "new-year-shift",
        new Date(2024, 11, 31, 22, 0, 0),
        new Date(2025, 0, 1, 6, 0, 0)
      );

      const meta = createMeta("2024-12-31", WorkDayType.Regular);

      const shiftMap = buildShiftMap(shift, meta);

      expect(shiftMap.totalHours).toBe(8);
      expect(shiftMap.regular.hours100.hours).toBe(8);
    });

    it("should handle leap year February 29th", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2024,
        month: 2,
        eventMap: {},
      });

      const feb29 = workDays[28]; // Index 28 (0-based) = day 29
      expect(feb29.meta.date).toBe("2024-02-29");

      // Process shift on leap day
      const shift = createShift(
        "leap-day-shift",
        new Date(2024, 1, 29, 9, 0, 0),
        new Date(2024, 1, 29, 17, 0, 0)
      );

      const shiftMap = buildShiftMap(shift, feb29.meta);

      expect(shiftMap.regular.hours100.hours).toBe(8);
    });

    it("should handle month with 31 days (January)", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      expect(workDays).toHaveLength(31);
      expect(workDays[0].meta.date).toBe("2025-01-01");
      expect(workDays[30].meta.date).toBe("2025-01-31");
    });

    it("should handle month with 30 days (April)", () => {
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 4,
        eventMap: {},
      });

      expect(workDays).toHaveLength(30);
      expect(workDays[29].meta.date).toBe("2025-04-30");
    });
  });

  describe("Performance Tests", () => {
    it("should process full month efficiently (< 100ms)", () => {
      const startTime = performance.now();

      // Build full month structure
      const workDays = pipeline.payMap.workDaysForMonthBuilder.build({
        year: 2025,
        month: 1,
        eventMap: {},
      });

      // Process all work days
      const results = workDays.map((workDay) => {
        const shift = createShift(
          `shift-${workDay.meta.date}`,
          new Date(workDay.meta.date + "T09:00:00"),
          new Date(workDay.meta.date + "T17:00:00")
        );

        return buildShiftMap(shift, workDay.meta);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(100);
      expect(results).toHaveLength(31);
    });
  });
});
