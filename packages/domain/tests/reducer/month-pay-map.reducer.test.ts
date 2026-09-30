import { describe, it, expect, beforeEach, vi } from "vitest";
import { MonthPayMapReducer } from "../../src/reducer/month-pay-map.reducer.js";
import type { WorkDayMap } from "../../src/index.js";
import type { WorkDayMonthReducer } from "../../src/reducer/workday-month.reducer.js";
import type { FixedSegmentMonthReducer } from "../../src/reducer/fixed-segment-month.reducer.js";
import type { MealAllowanceMonthReducer } from "../../src/reducer/meal-allowance-month.reducer.js";
import type { PerDiemMonthReducer } from "../../src/types/services.js";

describe("MonthPayMapReducer", () => {
  let reducer: MonthPayMapReducer;
  let mockWorkPay: WorkDayMonthReducer;
  let mockFixed: FixedSegmentMonthReducer;
  let mockAllowances: MealAllowanceMonthReducer;
  let mockPerDiem: PerDiemMonthReducer;

  beforeEach(() => {
    // Mock WorkDayMonthReducer
    mockWorkPay = {
      createEmpty: vi.fn(() => ({
        regular: {
          hours100: { percent: 1, hours: 0 },
          hours125: { percent: 1.25, hours: 0 },
          hours150: { percent: 1.5, hours: 0 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 0 },
          hours50: { percent: 0.5, hours: 0 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 0 },
          shabbat200: { percent: 2, hours: 0 },
        },
      })),
      accumulate: vi.fn((base, add) => ({
        regular: {
          hours100: { percent: 1, hours: base.regular.hours100.hours + add.workMap.regular.hours100.hours },
          hours125: { percent: 1.25, hours: base.regular.hours125.hours + add.workMap.regular.hours125.hours },
          hours150: { percent: 1.5, hours: base.regular.hours150.hours + add.workMap.regular.hours150.hours },
        },
        extra: {
          hours20: { percent: 0.2, hours: base.extra.hours20.hours + add.workMap.extra.hours20.hours },
          hours50: { percent: 0.5, hours: base.extra.hours50.hours + add.workMap.extra.hours50.hours },
        },
        special: {
          shabbat150: { percent: 1.5, hours: base.special.shabbat150.hours + add.workMap.special.shabbat150.hours },
          shabbat200: { percent: 2, hours: base.special.shabbat200.hours + add.workMap.special.shabbat200.hours },
        },
      })),
    } as unknown as WorkDayMonthReducer;

    // Mock FixedSegmentMonthReducer
    mockFixed = {
      createEmpty: vi.fn(() => ({
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
      })),
      accumulate: vi.fn((base, add) => ({
        hours100Sick: { percent: 1, hours: base.hours100Sick.hours + add.hours100Sick.hours },
        hours100Vacation: { percent: 1, hours: base.hours100Vacation.hours + add.hours100Vacation.hours },
        earnedShabbatCredit: { percent: 1.5, hours: base.earnedShabbatCredit.hours + add.earnedShabbatCredit.hours },
      })),
    } as unknown as FixedSegmentMonthReducer;

    // Mock MealAllowanceMonthReducer
    mockAllowances = {
      createEmpty: vi.fn(() => ({
        small: { points: 0, amount: 0 },
        large: { points: 0, amount: 0 },
      })),
      accumulate: vi.fn((base, add) => ({
        small: { points: base.small.points + add.small.points, amount: base.small.amount + add.small.amount },
        large: { points: base.large.points + add.large.points, amount: base.large.amount + add.large.amount },
      })),
    } as unknown as MealAllowanceMonthReducer;

    // Mock PerDiemMonthReducer
    mockPerDiem = {
      createEmpty: vi.fn(() => ({
        tier: null,
        points: 0,
        amount: 0,
      })),
      accumulate: vi.fn((base, add) => ({
        tier: null,
        points: base.points + add.points,
        amount: base.amount + add.amount,
      })),
    } as unknown as PerDiemMonthReducer;

    reducer = new MonthPayMapReducer(mockWorkPay, mockFixed, mockAllowances, mockPerDiem);
  });

  describe("createEmpty", () => {
    it("should create empty month pay map with all components", () => {
      const result = reducer.createEmpty();

      expect(result).toHaveProperty("regular");
      expect(result).toHaveProperty("extra");
      expect(result).toHaveProperty("special");
      expect(result).toHaveProperty("hours100Sick");
      expect(result).toHaveProperty("hours100Vacation");
      expect(result).toHaveProperty("earnedShabbatCredit");
      expect(result).toHaveProperty("perDiem");
      expect(result).toHaveProperty("mealAllowance");
      expect(result).toHaveProperty("totalHours");
    });

    it("should have zero totalHours", () => {
      const result = reducer.createEmpty();

      expect(result.totalHours).toBe(0);
    });

    it("should call all sub-reducer createEmpty methods", () => {
      vi.clearAllMocks();

      reducer.createEmpty();

      expect(mockWorkPay.createEmpty).toHaveBeenCalled();
      expect(mockFixed.createEmpty).toHaveBeenCalled();
      expect(mockAllowances.createEmpty).toHaveBeenCalled();
      expect(mockPerDiem.createEmpty).toHaveBeenCalled();
    });

    it("should return consistent empty structure", () => {
      const result1 = reducer.createEmpty();
      const result2 = reducer.createEmpty();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });

    it("should spread workPay empty correctly", () => {
      const result = reducer.createEmpty();

      expect(result.regular).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should spread fixed empty correctly", () => {
      const result = reducer.createEmpty();

      expect(result.hours100Sick).toEqual({ percent: 1, hours: 0 });
      expect(result.hours100Vacation).toEqual({ percent: 1, hours: 0 });
      expect(result.earnedShabbatCredit).toEqual({ percent: 1.5, hours: 0 });
    });

    it("should include perDiem from perDiem reducer", () => {
      const result = reducer.createEmpty();

      expect(result.perDiem).toEqual({
        tier: null,
        points: 0,
        amount: 0,
      });
    });

    it("should include mealAllowance from allowances reducer", () => {
      const result = reducer.createEmpty();

      expect(result.mealAllowance).toEqual({
        small: { points: 0, amount: 0 },
        large: { points: 0, amount: 0 },
      });
    });
  });

  describe("accumulate", () => {
    it("should accumulate totalHours", () => {
      const base = reducer.createEmpty();
      base.totalHours = 40;

      const add: Partial<WorkDayMap> = {
        totalHours: 8,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 0,
        },
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: false,
          diemInfo: { tier: null, points: 0, amount: 0 },
        },
        mealAllowance: {
          small: { points: 0, amount: 0 },
          large: { points: 0, amount: 0 },
        },
      };

      const result = reducer.accumulate(base, add as WorkDayMap);

      expect(result.totalHours).toBe(48);
    });

    it("should call workPay accumulate", () => {
      const base = reducer.createEmpty();
      const add: Partial<WorkDayMap> = {
        totalHours: 8,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 8,
        },
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: false,
          diemInfo: { tier: null, points: 0, amount: 0 },
        },
        mealAllowance: {
          small: { points: 0, amount: 0 },
          large: { points: 0, amount: 0 },
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base, add as WorkDayMap);

      expect(mockWorkPay.accumulate).toHaveBeenCalledWith(base, add);
    });

    it("should call fixed accumulate", () => {
      const base = reducer.createEmpty();
      const add: Partial<WorkDayMap> = {
        totalHours: 0,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 0,
        },
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: false,
          diemInfo: { tier: null, points: 0, amount: 0 },
        },
        mealAllowance: {
          small: { points: 0, amount: 0 },
          large: { points: 0, amount: 0 },
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base, add as WorkDayMap);

      expect(mockFixed.accumulate).toHaveBeenCalledWith(base, add);
    });

    it("should call perDiem accumulate with diemInfo", () => {
      const base = reducer.createEmpty();
      const add: Partial<WorkDayMap> = {
        totalHours: 0,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 0,
        },
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: true,
          diemInfo: { tier: "A" as const, points: 1, amount: 36.3 },
        },
        mealAllowance: {
          small: { points: 0, amount: 0 },
          large: { points: 0, amount: 0 },
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base, add as WorkDayMap);

      expect(mockPerDiem.accumulate).toHaveBeenCalledWith(
        base.perDiem,
        add.perDiem!.diemInfo
      );
    });

    it("should call allowances accumulate with mealAllowance", () => {
      const base = reducer.createEmpty();
      const add: Partial<WorkDayMap> = {
        totalHours: 0,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 0,
        },
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: false,
          diemInfo: { tier: null, points: 0, amount: 0 },
        },
        mealAllowance: {
          small: { points: 1, amount: 14.5 },
          large: { points: 0, amount: 0 },
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base, add as WorkDayMap);

      expect(mockAllowances.accumulate).toHaveBeenCalledWith(
        base.mealAllowance,
        add.mealAllowance
      );
    });

    it("should call all sub-reducers in accumulate", () => {
      const base = reducer.createEmpty();
      const add: Partial<WorkDayMap> = {
        totalHours: 8,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 8,
        },
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: false,
          diemInfo: { tier: null, points: 0, amount: 0 },
        },
        mealAllowance: {
          small: { points: 0, amount: 0 },
          large: { points: 0, amount: 0 },
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base, add as WorkDayMap);

      expect(mockWorkPay.accumulate).toHaveBeenCalledTimes(1);
      expect(mockFixed.accumulate).toHaveBeenCalledTimes(1);
      expect(mockPerDiem.accumulate).toHaveBeenCalledTimes(1);
      expect(mockAllowances.accumulate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration: Orchestration", () => {
    it("should orchestrate all reducers in createEmpty", () => {
      vi.clearAllMocks();

      const result = reducer.createEmpty();

      expect(mockWorkPay.createEmpty).toHaveBeenCalledTimes(1);
      expect(mockFixed.createEmpty).toHaveBeenCalledTimes(1);
      expect(mockAllowances.createEmpty).toHaveBeenCalledTimes(1);
      expect(mockPerDiem.createEmpty).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it("should orchestrate all reducers in accumulate", () => {
      const base = reducer.createEmpty();
      const add: Partial<WorkDayMap> = {
        totalHours: 10,
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 1 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 12,
        },
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        earnedShabbatCredit: { percent: 1.5, hours: 0 },
        perDiem: {
          isFieldDutyDay: true,
          diemInfo: { tier: "A" as const, points: 1, amount: 36.3 },
        },
        mealAllowance: {
          small: { points: 0, amount: 0 },
          large: { points: 1, amount: 21.1 },
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base, add as WorkDayMap);

      expect(mockWorkPay.accumulate).toHaveBeenCalledTimes(1);
      expect(mockFixed.accumulate).toHaveBeenCalledTimes(1);
      expect(mockPerDiem.accumulate).toHaveBeenCalledTimes(1);
      expect(mockAllowances.accumulate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Structure and Composition", () => {
    it("should return complete MonthPayMap structure", () => {
      const result = reducer.createEmpty();

      const expectedKeys = [
        "regular",
        "extra",
        "special",
        "hours100Sick",
        "hours100Vacation",
        "earnedShabbatCredit",
        "perDiem",
        "mealAllowance",
        "totalHours",
      ];

      expectedKeys.forEach((key) => {
        expect(result).toHaveProperty(key);
      });
    });

    it("should spread workPay and fixed results correctly", () => {
      const result = reducer.createEmpty();

      // From workPay
      expect(result.regular).toBeDefined();
      expect(result.extra).toBeDefined();
      expect(result.special).toBeDefined();

      // From fixed
      expect(result.hours100Sick).toBeDefined();
      expect(result.hours100Vacation).toBeDefined();
      expect(result.earnedShabbatCredit).toBeDefined();
    });

    it("should properly nest perDiem and mealAllowance", () => {
      const result = reducer.createEmpty();

      expect(result.perDiem).toHaveProperty("tier");
      expect(result.perDiem).toHaveProperty("points");
      expect(result.perDiem).toHaveProperty("amount");

      expect(result.mealAllowance).toHaveProperty("small");
      expect(result.mealAllowance).toHaveProperty("large");
    });
  });
});
