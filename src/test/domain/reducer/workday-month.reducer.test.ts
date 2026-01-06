import { describe, it, expect, beforeEach, vi } from "vitest";
import { WorkDayMonthReducer } from "@/domain/reducer/workday-month.reducer";
import type {
  WorkDayReducerBundle,
  MonthPayMap,
  WorkDayMap,
  RegularBreakdown,
  ExtraBreakdown,
  SpecialBreakdown,
  Reducer,
} from "@/domain";

describe("WorkDayMonthReducer", () => {
  let reducer: WorkDayMonthReducer;
  let mockBundle: WorkDayReducerBundle;
  let mockRegularReducer: Reducer<RegularBreakdown>;
  let mockExtraReducer: Reducer<ExtraBreakdown>;
  let mockSpecialReducer: Reducer<SpecialBreakdown>;

  beforeEach(() => {
    // Mock Regular Reducer
    mockRegularReducer = {
      createEmpty: vi.fn(() => ({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      })),
      accumulate: vi.fn((base, add) => ({
        hours100: { 
          percent: 1, 
          hours: (base?.hours100?.hours ?? 0) + (add?.hours100?.hours ?? 0) 
        },
        hours125: { 
          percent: 1.25, 
          hours: (base?.hours125?.hours ?? 0) + (add?.hours125?.hours ?? 0) 
        },
        hours150: { 
          percent: 1.5, 
          hours: (base?.hours150?.hours ?? 0) + (add?.hours150?.hours ?? 0) 
        },
      })),
      subtract: vi.fn((base, sub) => ({
        hours100: { 
          percent: 1, 
          hours: Math.max(0, (base?.hours100?.hours ?? 0) - (sub?.hours100?.hours ?? 0)) 
        },
        hours125: { 
          percent: 1.25, 
          hours: Math.max(0, (base?.hours125?.hours ?? 0) - (sub?.hours125?.hours ?? 0)) 
        },
        hours150: { 
          percent: 1.5, 
          hours: Math.max(0, (base?.hours150?.hours ?? 0) - (sub?.hours150?.hours ?? 0)) 
        },
      })),
    };

    // Mock Extra Reducer
    mockExtraReducer = {
      createEmpty: vi.fn(() => ({
        hours20: { percent: 0.2, hours: 0 },
        hours50: { percent: 0.5, hours: 0 },
      })),
      accumulate: vi.fn((base, add) => ({
        hours20: { 
          percent: 0.2, 
          hours: (base?.hours20?.hours ?? 0) + (add?.hours20?.hours ?? 0) 
        },
        hours50: { 
          percent: 0.5, 
          hours: (base?.hours50?.hours ?? 0) + (add?.hours50?.hours ?? 0) 
        },
      })),
      subtract: vi.fn((base, sub) => ({
        hours20: { 
          percent: 0.2, 
          hours: Math.max(0, (base?.hours20?.hours ?? 0) - (sub?.hours20?.hours ?? 0)) 
        },
        hours50: { 
          percent: 0.5, 
          hours: Math.max(0, (base?.hours50?.hours ?? 0) - (sub?.hours50?.hours ?? 0)) 
        },
      })),
    };

    // Mock Special Reducer
    mockSpecialReducer = {
      createEmpty: vi.fn(() => ({
        shabbat150: { percent: 1.5, hours: 0 },
        shabbat200: { percent: 2, hours: 0 },
      })),
      accumulate: vi.fn((base, add) => ({
        shabbat150: { 
          percent: 1.5, 
          hours: (base?.shabbat150?.hours ?? 0) + (add?.shabbat150?.hours ?? 0) 
        },
        shabbat200: { 
          percent: 2, 
          hours: (base?.shabbat200?.hours ?? 0) + (add?.shabbat200?.hours ?? 0) 
        },
      })),
      subtract: vi.fn((base, sub) => ({
        shabbat150: { 
          percent: 1.5, 
          hours: Math.max(0, (base?.shabbat150?.hours ?? 0) - (sub?.shabbat150?.hours ?? 0)) 
        },
        shabbat200: { 
          percent: 2, 
          hours: Math.max(0, (base?.shabbat200?.hours ?? 0) - (sub?.shabbat200?.hours ?? 0)) 
        },
      })),
    };

    mockBundle = {
      regular: mockRegularReducer,
      extra: mockExtraReducer,
      special: mockSpecialReducer,
    };

    reducer = new WorkDayMonthReducer(mockBundle);
  });

  describe("createEmpty", () => {
    it("should create empty work pay part with all three breakdowns", () => {
      const result = reducer.createEmpty();

      expect(result).toEqual({
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
      });
    });

    it("should call regular reducer createEmpty", () => {
      reducer.createEmpty();

      expect(mockRegularReducer.createEmpty).toHaveBeenCalled();
    });

    it("should call extra reducer createEmpty", () => {
      reducer.createEmpty();

      expect(mockExtraReducer.createEmpty).toHaveBeenCalled();
    });

    it("should call special reducer createEmpty", () => {
      reducer.createEmpty();

      expect(mockSpecialReducer.createEmpty).toHaveBeenCalled();
    });

    it("should return a new object each time", () => {
      const result1 = reducer.createEmpty();
      const result2 = reducer.createEmpty();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should have all three breakdown properties", () => {
      const result = reducer.createEmpty();

      expect(result).toHaveProperty("regular");
      expect(result).toHaveProperty("extra");
      expect(result).toHaveProperty("special");
    });

    it("should call all three reducers once", () => {
      vi.clearAllMocks();

      reducer.createEmpty();

      expect(mockRegularReducer.createEmpty).toHaveBeenCalledTimes(1);
      expect(mockExtraReducer.createEmpty).toHaveBeenCalledTimes(1);
      expect(mockSpecialReducer.createEmpty).toHaveBeenCalledTimes(1);
    });
  });

  describe("accumulate", () => {
    it("should accumulate regular hours through regular reducer", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
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
          totalHours: 10,
        },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockRegularReducer.accumulate).toHaveBeenCalledWith(
        base.regular,
        add.workMap!.regular
      );
      expect(result.regular.hours100.hours).toBe(48);
      expect(result.regular.hours125.hours).toBe(12);
    });

    it("should accumulate extra hours through extra reducer", () => {
      const base: Partial<MonthPayMap> = {
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 3,
        },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockExtraReducer.accumulate).toHaveBeenCalledWith(
        base.extra,
        add.workMap!.extra
      );
      expect(result.extra.hours20.hours).toBe(7);
      expect(result.extra.hours50.hours).toBe(4);
    });

    it("should accumulate special hours through special reducer", () => {
      const base: Partial<MonthPayMap> = {
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
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
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 10,
        },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockSpecialReducer.accumulate).toHaveBeenCalledWith(
        base.special,
        add.workMap!.special
      );
      expect(result.special.shabbat150.hours).toBe(18);
      expect(result.special.shabbat200.hours).toBe(7);
    });

    it("should accumulate all three breakdowns simultaneously", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 23,
        },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(48);
      expect(result.extra.hours20.hours).toBe(7);
      expect(result.special.shabbat150.hours).toBe(18);
    });

    it("should call all three reducers accumulate method", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 23,
        },
      };

      vi.clearAllMocks();

      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockRegularReducer.accumulate).toHaveBeenCalledTimes(1);
      expect(mockExtraReducer.accumulate).toHaveBeenCalledTimes(1);
      expect(mockSpecialReducer.accumulate).toHaveBeenCalledTimes(1);
    });

    it("should pass correct arguments to regular reducer", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
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
          totalHours: 10,
        },
      };

      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockRegularReducer.accumulate).toHaveBeenCalledWith(
        base.regular,
        add.workMap!.regular
      );
    });

    it("should handle empty additions", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
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
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(40);
      expect(result.extra.hours20.hours).toBe(5);
      expect(result.special.shabbat150.hours).toBe(10);
    });
  });

  describe("subtract", () => {
    it("should subtract regular hours through regular reducer", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 48 },
          hours125: { percent: 1.25, hours: 12 },
          hours150: { percent: 1.5, hours: 5 },
        },
      };
      const sub: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
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
          totalHours: 10,
        },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockRegularReducer.subtract).toHaveBeenCalledWith(
        base.regular,
        sub.workMap!.regular
      );
      expect(result.regular.hours100.hours).toBe(40);
      expect(result.regular.hours125.hours).toBe(10);
    });

    it("should subtract extra hours through extra reducer", () => {
      const base: Partial<MonthPayMap> = {
        extra: {
          hours20: { percent: 0.2, hours: 7 },
          hours50: { percent: 0.5, hours: 4 },
        },
      };
      const sub: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 3,
        },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockExtraReducer.subtract).toHaveBeenCalledWith(
        base.extra,
        sub.workMap!.extra
      );
      expect(result.extra.hours20.hours).toBe(5);
      expect(result.extra.hours50.hours).toBe(3);
    });

    it("should subtract special hours through special reducer", () => {
      const base: Partial<MonthPayMap> = {
        special: {
          shabbat150: { percent: 1.5, hours: 18 },
          shabbat200: { percent: 2, hours: 7 },
        },
      };
      const sub: Partial<WorkDayMap> = {
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
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 10,
        },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockSpecialReducer.subtract).toHaveBeenCalledWith(
        base.special,
        sub.workMap!.special
      );
      expect(result.special.shabbat150.hours).toBe(10);
      expect(result.special.shabbat200.hours).toBe(5);
    });

    it("should subtract all three breakdowns simultaneously", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 48 },
          hours125: { percent: 1.25, hours: 12 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 7 },
          hours50: { percent: 0.5, hours: 4 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 18 },
          shabbat200: { percent: 2, hours: 7 },
        },
      };
      const sub: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 23,
        },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(40);
      expect(result.extra.hours20.hours).toBe(5);
      expect(result.special.shabbat150.hours).toBe(10);
    });

    it("should call all three reducers subtract method", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 48 },
          hours125: { percent: 1.25, hours: 12 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 7 },
          hours50: { percent: 0.5, hours: 4 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 18 },
          shabbat200: { percent: 2, hours: 7 },
        },
      };
      const sub: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 23,
        },
      };

      vi.clearAllMocks();

      reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockRegularReducer.subtract).toHaveBeenCalledTimes(1);
      expect(mockExtraReducer.subtract).toHaveBeenCalledTimes(1);
      expect(mockSpecialReducer.subtract).toHaveBeenCalledTimes(1);
    });

    it("should handle subtracting empty values", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const sub: Partial<WorkDayMap> = {
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
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(40);
      expect(result.extra.hours20.hours).toBe(5);
      expect(result.special.shabbat150.hours).toBe(10);
    });

    it("should prevent negative values through reducer implementations", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 5 },
          hours125: { percent: 1.25, hours: 2 },
          hours150: { percent: 1.5, hours: 1 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 1 },
          hours50: { percent: 0.5, hours: 1 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 2 },
          shabbat200: { percent: 2, hours: 1 },
        },
      };
      const sub: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 10 },
            hours125: { percent: 1.25, hours: 10 },
            hours150: { percent: 1.5, hours: 10 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 10 },
            hours50: { percent: 0.5, hours: 10 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 10 },
            shabbat200: { percent: 2, hours: 10 },
          },
          totalHours: 80,
        },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(0);
      expect(result.extra.hours20.hours).toBe(0);
      expect(result.special.shabbat150.hours).toBe(0);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical workday addition", () => {
      let monthTotal = reducer.createEmpty();

      const regularDay: Partial<WorkDayMap> = {
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
      };

      for (let i = 0; i < 20; i++) {
        monthTotal = reducer.accumulate(monthTotal, regularDay as WorkDayMap);
      }

      expect(monthTotal.regular.hours100.hours).toBe(160);
    });

    it("should handle overtime day", () => {
      let monthTotal = reducer.createEmpty();

      const overtimeDay: Partial<WorkDayMap> = {
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
      };

      monthTotal = reducer.accumulate(monthTotal, overtimeDay as WorkDayMap);

      expect(monthTotal.regular.hours100.hours).toBe(8);
      expect(monthTotal.regular.hours125.hours).toBe(2);
      expect(monthTotal.extra.hours20.hours).toBe(1);
      expect(monthTotal.extra.hours50.hours).toBe(1);
    });

    it("should handle Shabbat work", () => {
      let monthTotal = reducer.createEmpty();

      const shabbatDay: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 8 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 2 },
            shabbat200: { percent: 2, hours: 8 },
          },
          totalHours: 18,
        },
      };

      monthTotal = reducer.accumulate(monthTotal, shabbatDay as WorkDayMap);

      expect(monthTotal.regular.hours150.hours).toBe(8);
      expect(monthTotal.special.shabbat150.hours).toBe(2);
      expect(monthTotal.special.shabbat200.hours).toBe(8);
    });

    it("should handle mixed month with different shift types", () => {
      let monthTotal = reducer.createEmpty();

      // Regular days
      for (let i = 0; i < 20; i++) {
        monthTotal = reducer.accumulate(monthTotal, {
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
        } as WorkDayMap);
      }

      // Overtime days
      for (let i = 0; i < 3; i++) {
        monthTotal = reducer.accumulate(monthTotal, {
          workMap: {
            regular: {
              hours100: { percent: 1, hours: 8 },
              hours125: { percent: 1.25, hours: 2 },
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
            totalHours: 10,
          },
        } as WorkDayMap);
      }

      // Shabbat
      monthTotal = reducer.accumulate(monthTotal, {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 8 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 0 },
            hours50: { percent: 0.5, hours: 0 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 10 },
          },
          totalHours: 18,
        },
      } as WorkDayMap);

      expect(monthTotal.regular.hours100.hours).toBe(184);
      expect(monthTotal.regular.hours125.hours).toBe(6);
      expect(monthTotal.regular.hours150.hours).toBe(8);
      expect(monthTotal.special.shabbat200.hours).toBe(10);
    });

    it("should handle shift removal", () => {
      const monthTotal: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 160 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };

      const removedDay: Partial<WorkDayMap> = {
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
      };

      const result = reducer.subtract(monthTotal as MonthPayMap, removedDay as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(152);
    });

    it("should handle accumulate then subtract returning to original", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };

      const delta: Partial<WorkDayMap> = {
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
            shabbat150: { percent: 1.5, hours: 2 },
            shabbat200: { percent: 2, hours: 1 },
          },
          totalHours: 15,
        },
      };

      const accumulated = reducer.accumulate(base as MonthPayMap, delta as WorkDayMap);
      const result = reducer.subtract(accumulated, delta as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(40);
      expect(result.extra.hours20.hours).toBe(5);
      expect(result.special.shabbat150.hours).toBe(10);
    });
  });

  describe("Reducer Delegation", () => {
    it("should correctly delegate to workMap.regular", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 8 },
            hours125: { percent: 1.25, hours: 2 },
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
          totalHours: 10,
        },
      };

      vi.clearAllMocks();
      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockRegularReducer.accumulate).toHaveBeenCalledWith(
        base.regular,
        add.workMap!.regular
      );
    });

    it("should correctly delegate to workMap.extra", () => {
      const base: Partial<MonthPayMap> = {
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 0 },
            hours125: { percent: 1.25, hours: 0 },
            hours150: { percent: 1.5, hours: 0 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 2 },
            hours50: { percent: 0.5, hours: 1 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 0 },
            shabbat200: { percent: 2, hours: 0 },
          },
          totalHours: 3,
        },
      };

      vi.clearAllMocks();
      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockExtraReducer.accumulate).toHaveBeenCalledWith(
        base.extra,
        add.workMap!.extra
      );
    });

    it("should correctly delegate to workMap.special", () => {
      const base: Partial<MonthPayMap> = {
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
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
            shabbat150: { percent: 1.5, hours: 8 },
            shabbat200: { percent: 2, hours: 2 },
          },
          totalHours: 10,
        },
      };

      vi.clearAllMocks();
      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockSpecialReducer.accumulate).toHaveBeenCalledWith(
        base.special,
        add.workMap!.special
      );
    });
  });

  describe("Type Safety and Structure", () => {
    it("should return WorkPayPart structure", () => {
      const result = reducer.createEmpty();

      expect(Object.keys(result).sort()).toEqual(["extra", "regular", "special"]);
    });

    it("should maintain structure through operations", () => {
      const empty = reducer.createEmpty();
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 40 },
          hours125: { percent: 1.25, hours: 10 },
          hours150: { percent: 1.5, hours: 5 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 5 },
          hours50: { percent: 0.5, hours: 3 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 10 },
          shabbat200: { percent: 2, hours: 5 },
        },
      };
      const add: Partial<WorkDayMap> = {
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
            shabbat150: { percent: 1.5, hours: 2 },
            shabbat200: { percent: 2, hours: 1 },
          },
          totalHours: 15,
        },
      };

      const accumulated = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);
      const subtracted = reducer.subtract(accumulated, add as WorkDayMap);

      [empty, accumulated, subtracted].forEach((result) => {
        expect(result).toHaveProperty("regular");
        expect(result).toHaveProperty("extra");
        expect(result).toHaveProperty("special");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle all zero hours", () => {
      const empty = reducer.createEmpty();
      const base: Partial<MonthPayMap> = {
        regular: empty.regular,
        extra: empty.extra,
        special: empty.special,
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: empty.regular,
          extra: empty.extra,
          special: empty.special,
          totalHours: 0,
        },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result).toEqual(empty);
    });

    it("should handle very large values", () => {
      const base: Partial<MonthPayMap> = {
        regular: {
          hours100: { percent: 1, hours: 1000 },
          hours125: { percent: 1.25, hours: 500 },
          hours150: { percent: 1.5, hours: 250 },
        },
        extra: {
          hours20: { percent: 0.2, hours: 100 },
          hours50: { percent: 0.5, hours: 50 },
        },
        special: {
          shabbat150: { percent: 1.5, hours: 200 },
          shabbat200: { percent: 2, hours: 100 },
        },
      };
      const add: Partial<WorkDayMap> = {
        workMap: {
          regular: {
            hours100: { percent: 1, hours: 500 },
            hours125: { percent: 1.25, hours: 250 },
            hours150: { percent: 1.5, hours: 125 },
          },
          extra: {
            hours20: { percent: 0.2, hours: 50 },
            hours50: { percent: 0.5, hours: 25 },
          },
          special: {
            shabbat150: { percent: 1.5, hours: 100 },
            shabbat200: { percent: 2, hours: 50 },
          },
          totalHours: 1000,
        },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.regular.hours100.hours).toBe(1500);
      expect(result.extra.hours20.hours).toBe(150);
      expect(result.special.shabbat150.hours).toBe(300);
    });
  });
});
