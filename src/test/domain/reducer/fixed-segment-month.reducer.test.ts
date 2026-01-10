import { describe, it, expect, beforeEach, vi } from "vitest";
import { FixedSegmentMonthReducer } from "@/domain/reducer/fixed-segment-month.reducer";
import { FixedSegmentFactory } from "@/domain/factory/fixed-segment.factory";
import type { FixedSegmentBundle, MonthPayMap, WorkDayMap, Segment } from "@/domain";

describe("FixedSegmentMonthReducer", () => {
  let reducer: FixedSegmentMonthReducer;
  let mockBundle: FixedSegmentBundle;

  beforeEach(() => {
    mockBundle = {
      sick: {
        create: vi.fn((hours: number): Segment => ({
          percent: 1,
          hours,
        })),
      } as unknown as FixedSegmentFactory,
      vacation: {
        create: vi.fn((hours: number): Segment => ({
          percent: 1,
          hours,
        })),
      } as unknown as FixedSegmentFactory,
      extraShabbat: {
        create: vi.fn((hours: number): Segment => ({
          percent: 1.5,
          hours,
        })),
      } as unknown as FixedSegmentFactory,
    };
    reducer = new FixedSegmentMonthReducer(mockBundle);
  });

  describe("createEmpty", () => {
    it("should create empty fixed segments with zero hours", () => {
      const result = reducer.createEmpty();

      expect(result).toEqual({
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      });
    });

    it("should call all factories with zero", () => {
      reducer.createEmpty();

      expect(mockBundle.sick.create).toHaveBeenCalledWith(0);
      expect(mockBundle.vacation.create).toHaveBeenCalledWith(0);
      expect(mockBundle.extraShabbat.create).toHaveBeenCalledWith(0);
    });

    it("should return a new object each time", () => {
      const result1 = reducer.createEmpty();
      const result2 = reducer.createEmpty();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should have all three fixed segment properties", () => {
      const result = reducer.createEmpty();

      expect(result).toHaveProperty("hours100Sick");
      expect(result).toHaveProperty("hours100Vacation");
      expect(result).toHaveProperty("extra100Shabbat");
    });

    it("should have percent and hours in each segment", () => {
      const result = reducer.createEmpty();

      expect(result.hours100Sick).toHaveProperty("percent");
      expect(result.hours100Sick).toHaveProperty("hours");
      expect(result.hours100Vacation).toHaveProperty("percent");
      expect(result.hours100Vacation).toHaveProperty("hours");
      expect(result.extra100Shabbat).toHaveProperty("percent");
      expect(result.extra100Shabbat).toHaveProperty("hours");
    });
  });

  describe("accumulate", () => {
    it("should accumulate sick hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(16);
      expect(result.hours100Sick.hours).toBe(16);
    });

    it("should accumulate vacation hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockBundle.vacation.create).toHaveBeenCalledWith(24);
      expect(result.hours100Vacation.hours).toBe(24);
    });

    it("should accumulate extra Shabbat hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockBundle.extraShabbat.create).toHaveBeenCalledWith(15);
      expect(result.extra100Shabbat.hours).toBe(15);
    });

    it("should accumulate all segments simultaneously", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(16);
      expect(result.hours100Vacation.hours).toBe(24);
      expect(result.extra100Shabbat.hours).toBe(15);
    });

    it("should handle accumulating empty segments", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const add = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as Partial<WorkDayMap>;

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(8);
      expect(result.hours100Vacation.hours).toBe(16);
      expect(result.extra100Shabbat.hours).toBe(10);
    });

    it("should handle accumulating to empty base", () => {
      const base = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as Partial<MonthPayMap>;
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(8);
      expect(result.hours100Vacation.hours).toBe(16);
      expect(result.extra100Shabbat.hours).toBe(10);
    });

    it("should handle decimal hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 7.5 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 4.5 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(12);
    });

    it("should call factories with accumulated values", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 10 },
        hours100Vacation: { percent: 1, hours: 20 },
        extra100Shabbat: { percent: 1.5, hours: 30 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 5 },
        hours100Vacation: { percent: 1, hours: 10 },
        extra100Shabbat: { percent: 1.5, hours: 15 },
      };

      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(15);
      expect(mockBundle.vacation.create).toHaveBeenCalledWith(30);
      expect(mockBundle.extraShabbat.create).toHaveBeenCalledWith(45);
    });
  });

  describe("subtract", () => {
    it("should subtract sick hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 16 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(8);
      expect(result.hours100Sick.hours).toBe(8);
    });

    it("should subtract vacation hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 24 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockBundle.vacation.create).toHaveBeenCalledWith(16);
      expect(result.hours100Vacation.hours).toBe(16);
    });

    it("should subtract extra Shabbat hours", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 15 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockBundle.extraShabbat.create).toHaveBeenCalledWith(10);
      expect(result.extra100Shabbat.hours).toBe(10);
    });

    it("should subtract all segments simultaneously", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 16 },
        hours100Vacation: { percent: 1, hours: 24 },
        extra100Shabbat: { percent: 1.5, hours: 15 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(8);
      expect(result.hours100Vacation.hours).toBe(16);
      expect(result.extra100Shabbat.hours).toBe(10);
    });

    it("should not go below zero for any segment", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 5 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 3 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 10 },
        hours100Vacation: { percent: 1, hours: 20 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(0);
      expect(result.hours100Sick.hours).toBe(0);
      expect(mockBundle.vacation.create).toHaveBeenCalledWith(0);
      expect(result.hours100Vacation.hours).toBe(0);
      expect(mockBundle.extraShabbat.create).toHaveBeenCalledWith(0);
      expect(result.extra100Shabbat.hours).toBe(0);
    });

    it("should handle subtracting empty segments", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const sub = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as Partial<WorkDayMap>;

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(8);
      expect(result.hours100Vacation.hours).toBe(16);
      expect(result.extra100Shabbat.hours).toBe(10);
    });

    it("should handle subtracting from empty base", () => {
      const base = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as Partial<MonthPayMap>;
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };

      const result = reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(0);
      expect(result.hours100Vacation.hours).toBe(0);
      expect(result.extra100Shabbat.hours).toBe(0);
    });

    it("should handle decimal hours with Math.max", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 7.5 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 3.5 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(4);
    });

    it("should use Math.max to prevent negative values", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 2 },
        hours100Vacation: { percent: 1, hours: 3 },
        extra100Shabbat: { percent: 1.5, hours: 1 },
      };
      const sub: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 5 },
        hours100Vacation: { percent: 1, hours: 10 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      reducer.subtract(base as MonthPayMap, sub as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalledWith(0);
      expect(mockBundle.vacation.create).toHaveBeenCalledWith(0);
      expect(mockBundle.extraShabbat.create).toHaveBeenCalledWith(0);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle sick day addition to month", () => {
      let monthTotal = reducer.createEmpty();

      const sickDay: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      for (let i = 0; i < 3; i++) {
        monthTotal = reducer.accumulate(monthTotal as MonthPayMap, sickDay as WorkDayMap);
      }

      expect(monthTotal.hours100Sick.hours).toBe(24);
    });

    it("should handle vacation day addition to month", () => {
      let monthTotal = reducer.createEmpty();

      const vacationDay: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      for (let i = 0; i < 5; i++) {
        monthTotal = reducer.accumulate(monthTotal as MonthPayMap, vacationDay as WorkDayMap);
      }

      expect(monthTotal.hours100Vacation.hours).toBe(40);
    });

    it("should handle Shabbat extra hours accumulation", () => {
      let monthTotal = reducer.createEmpty();

      const shabbatDay: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };

      for (let i = 0; i < 4; i++) {
        monthTotal = reducer.accumulate(monthTotal as MonthPayMap, shabbatDay as WorkDayMap);
      }

      expect(monthTotal.extra100Shabbat.hours).toBe(40);
    });

    it("should handle mixed segment types in month", () => {
      let monthTotal = reducer.createEmpty();

      monthTotal = reducer.accumulate(monthTotal as MonthPayMap, {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as WorkDayMap);

      monthTotal = reducer.accumulate(monthTotal as MonthPayMap, {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as WorkDayMap);

      monthTotal = reducer.accumulate(monthTotal as MonthPayMap, {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      } as WorkDayMap);

      expect(monthTotal.hours100Sick.hours).toBe(8);
      expect(monthTotal.hours100Vacation.hours).toBe(8);
      expect(monthTotal.extra100Shabbat.hours).toBe(10);
    });

    it("should handle day removal from month", () => {
      const monthTotal: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 24 },
        hours100Vacation: { percent: 1, hours: 40 },
        extra100Shabbat: { percent: 1.5, hours: 20 },
      };

      const removedDay: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      };

      const result = reducer.subtract(monthTotal as MonthPayMap, removedDay as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(16);
      expect(result.hours100Vacation.hours).toBe(40);
      expect(result.extra100Shabbat.hours).toBe(20);
    });

    it("should handle accumulate then subtract to return to original", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 16 },
        hours100Vacation: { percent: 1, hours: 32 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const delta: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      const accumulated = reducer.accumulate(base as MonthPayMap, delta as WorkDayMap);
      const result = reducer.subtract(accumulated as MonthPayMap, delta as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(16);
      expect(result.hours100Vacation.hours).toBe(32);
      expect(result.extra100Shabbat.hours).toBe(10);
    });
  });

  describe("Factory Integration", () => {
    it("should use factories for all operations", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      vi.clearAllMocks();

      reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(mockBundle.sick.create).toHaveBeenCalled();
      expect(mockBundle.vacation.create).toHaveBeenCalled();
      expect(mockBundle.extraShabbat.create).toHaveBeenCalled();
    });

    it("should respect factory return values", () => {
      mockBundle.sick.create = vi.fn(() => ({ percent: 1, hours: 100 }));

      const result = reducer.createEmpty();

      expect(result.hours100Sick.hours).toBe(100);
    });

    it("should work with different factory implementations", () => {
      const customBundle: FixedSegmentBundle = {
        sick: {
          create: (hours: number): Segment => ({
            percent: 2, // Custom percentage
            hours,
          }),
        } as unknown as FixedSegmentFactory,
        vacation: {
          create: (hours: number): Segment => ({
            percent: 1,
            hours,
          }),
        } as unknown as FixedSegmentFactory,
        extraShabbat: {
          create: (hours: number): Segment => ({
            percent: 1.5,
            hours,
          }),
        } as unknown as FixedSegmentFactory,
      };

      const customReducer = new FixedSegmentMonthReducer(customBundle);
      const result = customReducer.createEmpty();

      expect(result.hours100Sick.percent).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle all zeros", () => {
      const base = reducer.createEmpty();
      const add = {
        hours100Sick: { percent: 1, hours: 0 },
        hours100Vacation: { percent: 1, hours: 0 },
        extra100Shabbat: { percent: 1.5, hours: 0 },
      } as Partial<WorkDayMap>;

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(0);
      expect(result.hours100Vacation.hours).toBe(0);
      expect(result.extra100Shabbat.hours).toBe(0);
    });

    it("should handle very large values", () => {
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 1000 },
        hours100Vacation: { percent: 1, hours: 2000 },
        extra100Shabbat: { percent: 1.5, hours: 3000 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 500 },
        hours100Vacation: { percent: 1, hours: 1000 },
        extra100Shabbat: { percent: 1.5, hours: 1500 },
      };

      const result = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);

      expect(result.hours100Sick.hours).toBe(1500);
      expect(result.hours100Vacation.hours).toBe(3000);
      expect(result.extra100Shabbat.hours).toBe(4500);
    });

    it("should handle precision with repeated operations", () => {
      let result = reducer.createEmpty();

      for (let i = 0; i < 10; i++) {
        result = reducer.accumulate(result as MonthPayMap, {
          hours100Sick: { percent: 1, hours: 0.1 },
          hours100Vacation: { percent: 1, hours: 0.1 },
          extra100Shabbat: { percent: 1.5, hours: 0.1 },
        } as WorkDayMap);
      }

      // Should be called with approximately 1.0
      const lastSickCall = (mockBundle.sick.create as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0][0];
      expect(lastSickCall).toBeCloseTo(1.0, 1);
    });
  });

  describe("Type Safety and Structure", () => {
    it("should return object with correct properties", () => {
      const result = reducer.createEmpty();

      expect(Object.keys(result).sort()).toEqual([
        "extra100Shabbat",
        "hours100Sick",
        "hours100Vacation",
      ]);
    });

    it("should maintain structure through operations", () => {
      const empty = reducer.createEmpty();
      const base: Partial<MonthPayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 16 },
        extra100Shabbat: { percent: 1.5, hours: 10 },
      };
      const add: Partial<WorkDayMap> = {
        hours100Sick: { percent: 1, hours: 8 },
        hours100Vacation: { percent: 1, hours: 8 },
        extra100Shabbat: { percent: 1.5, hours: 5 },
      };

      const accumulated = reducer.accumulate(base as MonthPayMap, add as WorkDayMap);
      const subtracted = reducer.subtract(accumulated as MonthPayMap, add as WorkDayMap);

      [empty, accumulated, subtracted].forEach((result) => {
        expect(result).toHaveProperty("hours100Sick");
        expect(result).toHaveProperty("hours100Vacation");
        expect(result).toHaveProperty("extra100Shabbat");
        expect(result.hours100Sick).toHaveProperty("percent");
        expect(result.hours100Sick).toHaveProperty("hours");
      });
    });
  });
});
