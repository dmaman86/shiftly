import { describe, it, expect, beforeEach, vi } from "vitest";
import { DefaultDayPayMapBuilder } from "@/domain/builder/daypaymap.builder";
import { RegularByDayCalculator } from "@/domain/calculator/regular/regularByDay.calculator";
import { ExtraCalculator } from "@/domain/calculator/extra/extra.calculator";
import { SpecialCalculator } from "@/domain/calculator/special/special.calculator";
import { FixedSegmentFactory } from "@/domain/factory/fixed-segment.factory";
import { DefaultPerDiemDayCalculator } from "@/domain/calculator/perdiem/perdiem-day.calculator";
import { TimelinePerDiemRateResolver } from "@/domain/resolve/timeline-per-diem-rate.resolver";
import { MealAllowanceResolver } from "@/domain/resolve/meal-allowance.resolver";
import { LargeMealAllowanceCalculator } from "@/domain/calculator/mealallowance/large-mealallowance.calculator";
import { SmallMealAllowanceCalculator } from "@/domain/calculator/mealallowance/small-mealallowance.calculator";
import { TimelineMealAllowanceRateResolver } from "@/domain/resolve/timeline-meal-allowance-rate.resolver";
import { WorkDayStatus, WorkDayType } from "@/constants/fields.constant";
import type { ShiftPayMap, WorkDayMeta, PayCalculationBundle, FixedSegmentBundle, PerDiemBundle, MealAllowanceBundle } from "@/domain";

describe("DefaultDayPayMapBuilder", () => {
  let builder: DefaultDayPayMapBuilder;
  let payCalculators: PayCalculationBundle;
  let fixedSegments: FixedSegmentBundle;
  let perDiemBundle: PerDiemBundle;
  let mealAllowanceBundle: MealAllowanceBundle;

  beforeEach(() => {
    // Setup pay calculators
    const regularCalculator = new RegularByDayCalculator({
      midTierThreshold: 2,
      percentages: {
        hours100: 1,
        hours125: 1.25,
        hours150: 1.5,
      },
    });
    const extraCalculator = new ExtraCalculator();
    const specialCalculator = new SpecialCalculator();

    payCalculators = {
      regular: regularCalculator,
      extra: extraCalculator,
      special: specialCalculator,
    };

    // Setup fixed segments
    fixedSegments = {
      sick: new FixedSegmentFactory(),
      vacation: new FixedSegmentFactory(),
      extraShabbat: new FixedSegmentFactory(),
    };

    // Setup per diem
    perDiemBundle = {
      calculator: new DefaultPerDiemDayCalculator(),
      rateResolver: new TimelinePerDiemRateResolver(),
    };

    // Setup meal allowance
    const largeCalculator = new LargeMealAllowanceCalculator();
    const smallCalculator = new SmallMealAllowanceCalculator();
    const mealResolver = new MealAllowanceResolver(largeCalculator, smallCalculator);
    
    mealAllowanceBundle = {
      resolver: mealResolver,
      rateResolver: new TimelineMealAllowanceRateResolver(),
    };

    // Create builder
    builder = new DefaultDayPayMapBuilder(
      payCalculators,
      fixedSegments,
      perDiemBundle,
      mealAllowanceBundle
    );
  });

  // Helper functions
  const createMeta = (
    date = "2024-01-15",
    typeDay = WorkDayType.Regular,
    crossDayContinuation = false
  ): WorkDayMeta => ({
    date,
    typeDay,
    crossDayContinuation,
  });

  const createShiftPayMap = (
    totalHours: number,
    regularHours: number,
    extraHours20: number = 0,
    extraHours50: number = 0,
    shabbat150Hours: number = 0,
    shabbat200Hours: number = 0,
    isFieldDuty: boolean = false
  ): ShiftPayMap => ({
    regular: {
      hours100: { percent: 1, hours: regularHours },
      hours125: { percent: 1.25, hours: 0 },
      hours150: { percent: 1.5, hours: 0 },
    },
    extra: {
      hours20: { percent: 0.2, hours: extraHours20 },
      hours50: { percent: 0.5, hours: extraHours50 },
    },
    special: {
      shabbat150: { percent: 1.5, hours: shabbat150Hours },
      shabbat200: { percent: 2.0, hours: shabbat200Hours },
    },
    totalHours,
    perDiemShift: {
      isFieldDutyShift: isFieldDuty,
      hours: totalHours,
    },
  });

  describe("build - Non-working days", () => {
    it("should build sick day with standard hours", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.sick,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.hours100Sick.hours).toBe(8.75);
      expect(result.hours100Vacation.hours).toBe(0);
      expect(result.totalHours).toBe(8.75);
      expect(result.workMap.totalHours).toBe(8.75);
    });

    it("should build vacation day with standard hours", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.vacation,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.hours100Vacation.hours).toBe(8.75);
      expect(result.hours100Sick.hours).toBe(0);
      expect(result.totalHours).toBe(8.75);
    });

    it("should have empty regular/extra/special for sick day", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.sick,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap.regular.hours100.hours).toBe(0);
      expect(result.workMap.extra.hours20.hours).toBe(0);
      expect(result.workMap.special.shabbat150.hours).toBe(0);
    });

    it("should have no per diem for non-working days", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.sick,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(false);
      expect(result.perDiem.diemInfo.points).toBe(0);
    });

    it("should have empty meal allowance for non-working days", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.vacation,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.mealAllowance.large.points).toBe(0);
      expect(result.mealAllowance.small.points).toBe(0);
    });
  });

  describe("build - Normal working days with single shift", () => {
    it("should build normal day with single 8-hour shift", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(8);
      expect(result.workMap.totalHours).toBe(8);
      expect(result.hours100Sick.hours).toBe(0);
      expect(result.hours100Vacation.hours).toBe(0);
    });

    it("should accumulate hours correctly for single shift", () => {
      const shifts = [createShiftPayMap(8, 8, 2, 1)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap.extra.hours20.hours).toBe(2);
      expect(result.workMap.extra.hours50.hours).toBe(1);
    });

    it("should calculate regular hours for normal day", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap.regular.hours100.hours).toBeGreaterThan(0);
    });
  });

  describe("build - Normal working days with multiple shifts", () => {
    it("should accumulate hours from multiple shifts", () => {
      const shifts = [
        createShiftPayMap(8, 8, 1, 0),
        createShiftPayMap(4, 4, 0, 1),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(12);
      expect(result.workMap.extra.hours20.hours).toBe(1);
      expect(result.workMap.extra.hours50.hours).toBe(1);
    });

    it("should accumulate special hours from multiple shifts", () => {
      const shifts = [
        createShiftPayMap(6, 0, 0, 0, 4, 2),
        createShiftPayMap(4, 0, 0, 0, 2, 2),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap.special.shabbat150.hours).toBe(6);
      expect(result.workMap.special.shabbat200.hours).toBe(4);
      expect(result.extra100Shabbat.hours).toBe(10);
    });

    it("should handle double shift (two 8-hour shifts)", () => {
      const shifts = [
        createShiftPayMap(8, 8),
        createShiftPayMap(8, 8),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(16);
    });
  });

  describe("build - Shabbat/Special days", () => {
    it("should handle Shabbat shift with special hours", () => {
      const shifts = [createShiftPayMap(8, 0, 0, 0, 8, 0)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-06", WorkDayType.SpecialFull),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap.special.shabbat150.hours).toBe(8);
      expect(result.extra100Shabbat.hours).toBe(8);
    });

    it("should subtract special hours from regular calculation", () => {
      const shifts = [createShiftPayMap(8, 0, 0, 0, 6, 2)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-06", WorkDayType.SpecialFull),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      const totalShabbat = result.workMap.special.shabbat150.hours + 
                          result.workMap.special.shabbat200.hours;
      expect(totalShabbat).toBe(8);
      
      // Regular hours should be 0 since all hours are special
      expect(result.workMap.regular.hours100.hours).toBe(0);
    });

    it("should handle Friday partial day with mixed hours", () => {
      const shifts = [createShiftPayMap(8, 4, 2, 0, 2, 0)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-05", WorkDayType.SpecialPartialStart),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap.special.shabbat150.hours).toBe(2);
      expect(result.workMap.extra.hours20.hours).toBe(2);
      expect(result.extra100Shabbat.hours).toBe(2);
    });
  });

  describe("build - Per Diem calculation", () => {
    it("should calculate per diem for field duty day (tier C)", () => {
      const shifts = [createShiftPayMap(12, 12, 0, 0, 0, 0, true)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(true);
      expect(result.perDiem.diemInfo.tier).toBe("C");
      expect(result.perDiem.diemInfo.points).toBe(3);
    });

    it("should calculate per diem for field duty day (tier B)", () => {
      const shifts = [createShiftPayMap(8, 8, 0, 0, 0, 0, true)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(true);
      expect(result.perDiem.diemInfo.tier).toBe("B");
      expect(result.perDiem.diemInfo.points).toBe(2);
    });

    it("should calculate per diem for field duty day (tier A)", () => {
      const shifts = [createShiftPayMap(4, 4, 0, 0, 0, 0, true)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(true);
      expect(result.perDiem.diemInfo.tier).toBe("A");
      expect(result.perDiem.diemInfo.points).toBe(1);
    });

    it("should not give per diem for non-field duty day", () => {
      const shifts = [createShiftPayMap(8, 8, 0, 0, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(false);
      expect(result.perDiem.diemInfo.points).toBe(0);
    });

    it("should accumulate field duty hours from multiple shifts", () => {
      const shifts = [
        createShiftPayMap(4, 4, 0, 0, 0, 0, true),
        createShiftPayMap(4, 4, 0, 0, 0, 0, true),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(true);
      expect(result.perDiem.diemInfo.tier).toBe("B");
    });

    it("should ignore non-field duty shifts in per diem calculation", () => {
      const shifts = [
        createShiftPayMap(4, 4, 0, 0, 0, 0, true),
        createShiftPayMap(4, 4, 0, 0, 0, 0, false),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.isFieldDutyDay).toBe(true);
      expect(result.perDiem.diemInfo.tier).toBe("A"); // Only 4 hours counted
    });
  });

  describe("build - Meal Allowance calculation", () => {
    it("should give large meal for 10+ hour shift without night hours (non-field duty)", () => {
      const shifts = [createShiftPayMap(10, 10, 0, 0, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.mealAllowance.large.points).toBe(1);
      expect(result.mealAllowance.small.points).toBe(0);
    });

    it("should treat shift with < 4 night hours as day shift (no small meal for 8h)", () => {
      const shifts = [createShiftPayMap(8, 6, 0, 2, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // Night hours < 4, so treated as day shift (hasMorning=true, hasNight=false)
      // 8-hour day shift doesn't qualify for small meal (needs 10+ hours)
      expect(result.mealAllowance.small.points).toBe(0);
      expect(result.mealAllowance.large.points).toBe(0);
    });

    it("should not give meal for short shifts", () => {
      const shifts = [createShiftPayMap(6, 6, 0, 0, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.mealAllowance.large.points).toBe(0);
      expect(result.mealAllowance.small.points).toBe(0);
    });

    it("should classify shift with 4+ night hours correctly", () => {
      const shifts = [createShiftPayMap(12, 6, 0, 6, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // Has significant night hours, should get large meal
      expect(result.mealAllowance.large.points).toBe(1);
    });

    it("should not give large meal for field duty day shift", () => {
      const shifts = [createShiftPayMap(10, 10, 0, 0, 0, 0, true)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // Field duty day shift shouldn't get large meal
      expect(result.mealAllowance.large.points).toBe(0);
    });
  });

  describe("build - classifyMealAllowanceDayInfo logic", () => {
    it("should classify as day shift with < 4 night hours (no meal for 8h)", () => {
      const shifts = [createShiftPayMap(8, 6, 0, 2, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // With < 4 night hours, should be treated as day shift (hasMorning=true, hasNight=false)
      // 8-hour day shift needs to be 10+ hours to qualify for meal allowance
      expect(result.mealAllowance.small.points).toBe(0);
      expect(result.mealAllowance.large.points).toBe(0);
    });

    it("should classify as night shift with 4+ night hours", () => {
      const shifts = [createShiftPayMap(10, 4, 0, 6, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // With 6 night hours, should have night classification
      expect(result.mealAllowance.large.points).toBe(1);
    });

    it("should include shabbat200 in night hours calculation (Shabbat: no meal)", () => {
      const shifts = [createShiftPayMap(8, 0, 0, 2, 0, 4, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-06", WorkDayType.SpecialFull),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // 2 hours50 + 4 shabbat200 = 6 night hours (hasNight=true)
      // But total hours is only 8, and for night shift needs 10+ for large meal
      // Night shifts should get large meal for 10+ hours or small meal otherwise
      expect(result.mealAllowance.small.points).toBe(1);
      expect(result.mealAllowance.large.points).toBe(0);
    });

    it("should calculate hasMorning based on ratio (total/night >= 2)", () => {
      const shifts = [createShiftPayMap(12, 6, 0, 6, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // 12 total / 6 night = 2, so hasMorning should be true
      // With both morning and night, non-field duty should get large meal
      expect(result.mealAllowance.large.points).toBe(1);
    });
  });

  describe("build - Integration with dependencies", () => {
    it("should call extra calculator accumulate", () => {
      const accumulateSpy = vi.spyOn(payCalculators.extra, "accumulate");
      
      const shifts = [
        createShiftPayMap(8, 8, 1, 0),
        createShiftPayMap(4, 4, 0, 1),
      ];

      builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(accumulateSpy).toHaveBeenCalled();
      expect(accumulateSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should call special calculator accumulate", () => {
      const accumulateSpy = vi.spyOn(payCalculators.special, "accumulate");
      
      const shifts = [
        createShiftPayMap(8, 0, 0, 0, 4, 4),
      ];

      builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-06", WorkDayType.SpecialFull),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(accumulateSpy).toHaveBeenCalled();
    });

    it("should call regular calculator calculate", () => {
      const calculateSpy = vi.spyOn(payCalculators.regular, "calculate");
      
      const shifts = [createShiftPayMap(8, 8)];

      builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(calculateSpy).toHaveBeenCalled();
      const callArgs = calculateSpy.mock.calls[0][0];
      expect(callArgs.standardHours).toBe(8.75);
    });

    it("should call perDiem calculator calculate", () => {
      const calculateSpy = vi.spyOn(perDiemBundle.calculator, "calculate");
      
      const shifts = [createShiftPayMap(8, 8, 0, 0, 0, 0, true)];

      builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(calculateSpy).toHaveBeenCalled();
    });

    it("should call perDiem rateResolver", () => {
      const resolveSpy = vi.spyOn(perDiemBundle.rateResolver, "resolve");
      
      const shifts = [createShiftPayMap(8, 8)];

      builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(resolveSpy).toHaveBeenCalledWith({ year: 2024, month: 1 });
    });

    it("should call meal allowance resolver", () => {
      const resolveSpy = vi.spyOn(mealAllowanceBundle.resolver, "resolve");
      
      const shifts = [createShiftPayMap(8, 8)];

      builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(resolveSpy).toHaveBeenCalled();
    });
  });

  describe("build - Return value structure", () => {
    it("should return WorkDayMap with all required properties", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result).toHaveProperty("workMap");
      expect(result).toHaveProperty("hours100Sick");
      expect(result).toHaveProperty("hours100Vacation");
      expect(result).toHaveProperty("extra100Shabbat");
      expect(result).toHaveProperty("perDiem");
      expect(result).toHaveProperty("totalHours");
      expect(result).toHaveProperty("mealAllowance");
    });

    it("should have valid workMap structure", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.workMap).toHaveProperty("regular");
      expect(result.workMap).toHaveProperty("extra");
      expect(result.workMap).toHaveProperty("special");
      expect(result.workMap).toHaveProperty("totalHours");
    });

    it("should have valid Segment structures", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.hours100Sick).toHaveProperty("percent");
      expect(result.hours100Sick).toHaveProperty("hours");
      expect(result.hours100Vacation).toHaveProperty("percent");
      expect(result.hours100Vacation).toHaveProperty("hours");
      expect(result.extra100Shabbat).toHaveProperty("percent");
      expect(result.extra100Shabbat).toHaveProperty("hours");
    });

    it("should have valid perDiem structure", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem).toHaveProperty("isFieldDutyDay");
      expect(result.perDiem).toHaveProperty("diemInfo");
      expect(result.perDiem.diemInfo).toHaveProperty("tier");
      expect(result.perDiem.diemInfo).toHaveProperty("points");
      expect(result.perDiem.diemInfo).toHaveProperty("amount");
    });

    it("should have valid mealAllowance structure", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.mealAllowance).toHaveProperty("large");
      expect(result.mealAllowance).toHaveProperty("small");
      expect(result.mealAllowance.large).toHaveProperty("points");
      expect(result.mealAllowance.large).toHaveProperty("amount");
    });

    it("should have non-negative values", () => {
      const shifts = [createShiftPayMap(8, 8, 2, 1)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBeGreaterThanOrEqual(0);
      expect(result.hours100Sick.hours).toBeGreaterThanOrEqual(0);
      expect(result.hours100Vacation.hours).toBeGreaterThanOrEqual(0);
      expect(result.extra100Shabbat.hours).toBeGreaterThanOrEqual(0);
      expect(result.perDiem.diemInfo.points).toBeGreaterThanOrEqual(0);
      expect(result.mealAllowance.large.points).toBeGreaterThanOrEqual(0);
      expect(result.mealAllowance.small.points).toBeGreaterThanOrEqual(0);
    });
  });

  describe("build - Edge cases", () => {
    it("should handle empty shifts array", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(0);
      expect(result.workMap.totalHours).toBe(0);
    });

    it("should handle very short shifts", () => {
      const shifts = [createShiftPayMap(1, 1)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(1);
    });

    it("should handle very long day (multiple shifts totaling 24 hours)", () => {
      const shifts = [
        createShiftPayMap(12, 12),
        createShiftPayMap(12, 12),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(24);
    });

    it("should handle different standard hours", () => {
      const shifts = [createShiftPayMap(9, 9)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 9,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(9);
    });

    it("should handle decimal hours", () => {
      const shifts = [createShiftPayMap(8.5, 8.5)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(8.5);
    });
  });

  describe("build - Realistic scenarios", () => {
    it("should handle typical weekday with single shift", () => {
      const shifts = [createShiftPayMap(8, 8)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(8);
      expect(result.hours100Sick.hours).toBe(0);
      expect(result.hours100Vacation.hours).toBe(0);
      expect(result.workMap.regular.hours100.hours).toBeGreaterThan(0);
    });

    it("should handle full Shabbat day", () => {
      const shifts = [createShiftPayMap(12, 0, 0, 0, 8, 4)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-06", WorkDayType.SpecialFull),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.extra100Shabbat.hours).toBe(12);
      expect(result.workMap.regular.hours100.hours).toBe(0);
    });

    it("should handle field duty day with meal allowance", () => {
      const shifts = [createShiftPayMap(12, 12, 0, 0, 0, 0, true)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.perDiem.diemInfo.tier).toBe("C");
      expect(result.perDiem.diemInfo.points).toBe(3);
      expect(result.mealAllowance.large.points).toBe(0); // Field duty day shift
    });

    it("should handle sick day", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.sick,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.hours100Sick.hours).toBe(8.75);
      expect(result.totalHours).toBe(8.75);
      expect(result.perDiem.isFieldDutyDay).toBe(false);
    });

    it("should handle vacation day", () => {
      const result = builder.build({
        shifts: [],
        status: WorkDayStatus.vacation,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.hours100Vacation.hours).toBe(8.75);
      expect(result.totalHours).toBe(8.75);
    });

    it("should handle double shift with overtime", () => {
      const shifts = [
        createShiftPayMap(8, 8, 1, 0),
        createShiftPayMap(8, 8, 1, 0),
      ];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(16);
      expect(result.workMap.extra.hours20.hours).toBe(2);
    });
  });

  describe("build - Data consistency", () => {
    it("should have totalHours matching workMap.totalHours for normal days", () => {
      const shifts = [createShiftPayMap(8, 8, 2, 1)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(result.totalHours).toBe(result.workMap.totalHours);
    });

    it("should have mutually exclusive sick and vacation hours", () => {
      const sickResult = builder.build({
        shifts: [],
        status: WorkDayStatus.sick,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(sickResult.hours100Sick.hours).toBe(8.75);
      expect(sickResult.hours100Vacation.hours).toBe(0);

      const vacationResult = builder.build({
        shifts: [],
        status: WorkDayStatus.vacation,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      expect(vacationResult.hours100Vacation.hours).toBe(8.75);
      expect(vacationResult.hours100Sick.hours).toBe(0);
    });

    it("should have extra100Shabbat matching total special hours", () => {
      const shifts = [createShiftPayMap(10, 0, 0, 0, 6, 4)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta("2024-01-06", WorkDayType.SpecialFull),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      const totalSpecial = 
        result.workMap.special.shabbat150.hours + 
        result.workMap.special.shabbat200.hours;
      
      expect(result.extra100Shabbat.hours).toBe(totalSpecial);
    });

    it("should not have both large and small meal allowance", () => {
      const shifts = [createShiftPayMap(12, 6, 0, 6, 0, 0, false)];

      const result = builder.build({
        shifts,
        status: WorkDayStatus.normal,
        meta: createMeta(),
        standardHours: 8.75,
        year: 2024,
        month: 1,
      });

      // Should have one or none, but not both
      const hasBoth = 
        result.mealAllowance.large.points > 0 && 
        result.mealAllowance.small.points > 0;
      
      expect(hasBoth).toBe(false);
    });
  });
});
