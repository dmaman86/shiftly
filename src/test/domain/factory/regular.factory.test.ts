import { describe, it, expect } from "vitest";
import { RegularFactory } from "@/domain/factory/regular.factory";
import { RegularByShiftCalculator } from "@/domain/calculator/regular/regularByShift.calculator";
import { RegularByDayCalculator } from "@/domain/calculator/regular/regularByDay.calculator";
import { RegularByMonthAccumulator } from "@/domain/reducer/regular-accumulator.reducer";
import type { RegularBreakdown, RegularInput } from "@/domain/types/data-shapes";
import { WorkDayType } from "@/constants/fields.constant";

describe("RegularFactory", () => {
  describe("byShift", () => {
    it("should return an instance of RegularByShiftCalculator", () => {
      const calculator = RegularFactory.byShift();

      expect(calculator).toBeInstanceOf(RegularByShiftCalculator);
    });

    it("should return a calculator with calculate method", () => {
      const calculator = RegularFactory.byShift();

      expect(calculator.calculate).toBeDefined();
      expect(typeof calculator.calculate).toBe("function");
    });

    it("should return a calculator with createEmpty method", () => {
      const calculator = RegularFactory.byShift();

      expect(calculator.createEmpty).toBeDefined();
      expect(typeof calculator.createEmpty).toBe("function");
    });

    it("should return a new instance on each call", () => {
      const calculator1 = RegularFactory.byShift();
      const calculator2 = RegularFactory.byShift();

      expect(calculator1).not.toBe(calculator2);
    });

    it("should return a functional calculator that can perform calculations", () => {
      const calculator = RegularFactory.byShift();

      const input: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should create empty breakdown correctly", () => {
      const calculator = RegularFactory.byShift();
      const empty = calculator.createEmpty();

      expect(empty).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle overtime calculations", () => {
      const calculator = RegularFactory.byShift();

      const input: RegularInput = {
        totalHours: 11,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // Both calculators allocate the same way for regular days:
      // 9 hours at 100%, 2 hours at 125%
      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle special day calculations", () => {
      const calculator = RegularFactory.byShift();

      const input: RegularInput = {
        totalHours: 8,
        standardHours: 0,
        meta: {
          date: "2024-01-06",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // Special days have no standard hours, all hours are 150%
      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 8 },
      });
    });
  });

  describe("byDay", () => {
    it("should return an instance of RegularByDayCalculator", () => {
      const calculator = RegularFactory.byDay();

      expect(calculator).toBeInstanceOf(RegularByDayCalculator);
    });

    it("should return a functional calculator that can perform calculations", () => {
      const calculator = RegularFactory.byDay();

      const input: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle overtime calculations (forward allocation)", () => {
      const calculator = RegularFactory.byDay();

      const input: RegularInput = {
        totalHours: 11,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // RegularByDay allocates in forward order: 100% first, then 125%, then 150%
      expect(result).toEqual({
        hours100: { percent: 1, hours: 9 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle special day calculations", () => {
      const calculator = RegularFactory.byDay();

      const input: RegularInput = {
        totalHours: 8,
        standardHours: 0,
        meta: {
          date: "2024-01-06",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const result = calculator.calculate(input);

      // Special days have no standard hours, all hours are 150%
      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 8 },
      });
    });
  });

  describe("monthReducer", () => {
    it("should return an instance of RegularByMonthAccumulator", () => {
      const reducer = RegularFactory.monthReducer();

      expect(reducer).toBeInstanceOf(RegularByMonthAccumulator);
    });

    it("should return a reducer with createEmpty method", () => {
      const reducer = RegularFactory.monthReducer();

      expect(reducer.createEmpty).toBeDefined();
      expect(typeof reducer.createEmpty).toBe("function");
    });

    it("should return a reducer with accumulate method", () => {
      const reducer = RegularFactory.monthReducer();

      expect(reducer.accumulate).toBeDefined();
      expect(typeof reducer.accumulate).toBe("function");
    });

    it("should return a reducer with subtract method", () => {
      const reducer = RegularFactory.monthReducer();

      expect(reducer.subtract).toBeDefined();
      expect(typeof reducer.subtract).toBe("function");
    });

    it("should return a new instance on each call", () => {
      const reducer1 = RegularFactory.monthReducer();
      const reducer2 = RegularFactory.monthReducer();

      expect(reducer1).not.toBe(reducer2);
    });

    it("should create empty breakdown correctly", () => {
      const reducer = RegularFactory.monthReducer();
      const empty = reducer.createEmpty();

      expect(empty).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should accumulate breakdowns correctly", () => {
      const reducer = RegularFactory.monthReducer();

      const breakdown1: RegularBreakdown = {
        hours100: { percent: 1, hours: 160 },
        hours125: { percent: 1.25, hours: 20 },
        hours150: { percent: 1.5, hours: 10 },
      };

      const breakdown2: RegularBreakdown = {
        hours100: { percent: 1, hours: 40 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = reducer.accumulate(breakdown1, breakdown2);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 200 },
        hours125: { percent: 1.25, hours: 25 },
        hours150: { percent: 1.5, hours: 12 },
      });
    });

    it("should subtract breakdowns correctly", () => {
      const reducer = RegularFactory.monthReducer();

      const breakdown1: RegularBreakdown = {
        hours100: { percent: 1, hours: 160 },
        hours125: { percent: 1.25, hours: 20 },
        hours150: { percent: 1.5, hours: 10 },
      };

      const breakdown2: RegularBreakdown = {
        hours100: { percent: 1, hours: 40 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = reducer.subtract(breakdown1, breakdown2);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 120 },
        hours125: { percent: 1.25, hours: 15 },
        hours150: { percent: 1.5, hours: 8 },
      });
    });

    it("should handle zero values in accumulate", () => {
      const reducer = RegularFactory.monthReducer();
      const empty = reducer.createEmpty();

      const breakdown: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const result = reducer.accumulate(empty, breakdown);

      expect(result).toEqual(breakdown);
    });

    it("should handle decimal values in accumulate", () => {
      const reducer = RegularFactory.monthReducer();

      const breakdown1: RegularBreakdown = {
        hours100: { percent: 1, hours: 8.5 },
        hours125: { percent: 1.25, hours: 2.25 },
        hours150: { percent: 1.5, hours: 1.75 },
      };

      const breakdown2: RegularBreakdown = {
        hours100: { percent: 1, hours: 4.5 },
        hours125: { percent: 1.25, hours: 1.75 },
        hours150: { percent: 1.5, hours: 0.25 },
      };

      const result = reducer.accumulate(breakdown1, breakdown2);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 13 },
        hours125: { percent: 1.25, hours: 4 },
        hours150: { percent: 1.5, hours: 2 },
      });
    });

    it("should handle negative results in subtract (clamps to 0)", () => {
      const reducer = RegularFactory.monthReducer();

      const breakdown1: RegularBreakdown = {
        hours100: { percent: 1, hours: 10 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const breakdown2: RegularBreakdown = {
        hours100: { percent: 1, hours: 15 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = reducer.subtract(breakdown1, breakdown2);

      // Subtract clamps negative values to 0
      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });
  });

  describe("Factory pattern validation", () => {
    it("should create different types from different factory methods", () => {
      const byShift = RegularFactory.byShift();
      const byDay = RegularFactory.byDay();
      const reducer = RegularFactory.monthReducer();

      expect(byShift).toBeInstanceOf(RegularByShiftCalculator);
      expect(byDay).toBeInstanceOf(RegularByDayCalculator);
      expect(reducer).toBeInstanceOf(RegularByMonthAccumulator);

      expect(byShift).not.toBeInstanceOf(RegularByDayCalculator);
      expect(byDay).not.toBeInstanceOf(RegularByShiftCalculator);
    });

    it("should have all factory methods defined", () => {
      expect(RegularFactory.byShift).toBeDefined();
      expect(RegularFactory.byDay).toBeDefined();
      expect(RegularFactory.monthReducer).toBeDefined();

      expect(typeof RegularFactory.byShift).toBe("function");
      expect(typeof RegularFactory.byDay).toBe("function");
      expect(typeof RegularFactory.monthReducer).toBe("function");
    });

    it("should create instances that share common interface", () => {
      const byShift = RegularFactory.byShift();
      const byDay = RegularFactory.byDay();

      // Both should have the same methods
      expect(byShift.calculate).toBeDefined();
      expect(byDay.calculate).toBeDefined();
      expect(byShift.createEmpty).toBeDefined();
      expect(byDay.createEmpty).toBeDefined();

      // For regular days, both produce the same results
      const input: RegularInput = {
        totalHours: 11,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      const resultByShift = byShift.calculate(input);
      const resultByDay = byDay.calculate(input);

      // For regular days, results are the same
      expect(resultByShift.hours100.hours).toBe(9);
      expect(resultByDay.hours100.hours).toBe(9);
      
      expect(resultByShift.hours125.hours).toBe(2);
      expect(resultByDay.hours125.hours).toBe(2);
      
      expect(resultByShift.hours150.hours).toBe(0);
      expect(resultByDay.hours150.hours).toBe(0);
    });
  });

  describe("Integration - Factory usage in workflows", () => {
    it("should allow using factory-created instances in typical workflows", () => {
      const calculator = RegularFactory.byShift();
      const reducer = RegularFactory.monthReducer();

      // Calculate day 1
      const day1Input: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };
      const day1Result = calculator.calculate(day1Input);

      // Calculate day 2
      const day2Input: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-02",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };
      const day2Result = calculator.calculate(day2Input);

      // Accumulate using month reducer
      const monthTotal = reducer.accumulate(day1Result, day2Result);

      expect(monthTotal).toEqual({
        hours100: { percent: 1, hours: 16 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle complex multi-day scenarios with overtime", () => {
      const calculator = RegularFactory.byDay();
      const reducer = RegularFactory.monthReducer();

      // Simulate 5 workdays with varying hours
      const days = [
        { totalHours: 8, standardHours: 9 },   // 8h @ 100%
        { totalHours: 9, standardHours: 9 },   // 9h @ 100%
        { totalHours: 10, standardHours: 9 },  // 9h @ 100%, 1h @ 125%
        { totalHours: 11, standardHours: 9 },  // 9h @ 100%, 2h @ 125%
        { totalHours: 12, standardHours: 9 },  // 9h @ 100%, 2h @ 125%, 1h @ 150%
      ];

      let monthAccumulator = reducer.createEmpty();

      days.forEach((day, index) => {
        const input: RegularInput = {
          totalHours: day.totalHours,
          standardHours: day.standardHours,
          meta: {
            date: `2024-01-0${index + 1}`,
            typeDay: WorkDayType.Regular,
            crossDayContinuation: false,
          },
        };
        const dayResult = calculator.calculate(input);
        monthAccumulator = reducer.accumulate(monthAccumulator, dayResult);
      });

      // Total: 8+9+9+9+9 = 44h @ 100%, 0+0+1+2+2 = 5h @ 125%, 0+0+0+0+1 = 1h @ 150%
      expect(monthAccumulator).toEqual({
        hours100: { percent: 1, hours: 44 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 1 },
      });
    });

    it("should handle mixed regular and special days", () => {
      const calculator = RegularFactory.byShift();
      const reducer = RegularFactory.monthReducer();

      // Regular day
      const regularDay: RegularInput = {
        totalHours: 8,
        standardHours: 9,
        meta: {
          date: "2024-01-01",
          typeDay: WorkDayType.Regular,
          crossDayContinuation: false,
        },
      };

      // Special day (Shabbat)
      const specialDay: RegularInput = {
        totalHours: 8,
        standardHours: 0,
        meta: {
          date: "2024-01-06",
          typeDay: WorkDayType.SpecialFull,
          crossDayContinuation: false,
        },
      };

      const regularResult = calculator.calculate(regularDay);
      const specialResult = calculator.calculate(specialDay);
      const total = reducer.accumulate(regularResult, specialResult);

      expect(total).toEqual({
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 8 },
      });
    });
  });
});
