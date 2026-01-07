import { describe, it, expect, beforeEach, vi } from "vitest";
import { MealAllowanceResolver } from "@/domain/resolve/meal-allowance.resolver";
import type { MealAllowanceDayInfo } from "@/domain/types/bundles";
import type { MealAllowanceEntry } from "@/domain/types/data-shapes";
import type { MealAllowanceRates } from "@/domain/types/types";
import type { LargeMealAllowanceCalculator } from "@/domain/calculator/mealallowance/large-mealallowance.calculator";
import type { SmallMealAllowanceCalculator } from "@/domain/calculator/mealallowance/small-mealallowance.calculator";

describe("MealAllowanceResolver", () => {
  let resolver: MealAllowanceResolver;
  let mockLargeCalculator: LargeMealAllowanceCalculator;
  let mockSmallCalculator: SmallMealAllowanceCalculator;

  // Helper function to create MealAllowanceDayInfo
  const createDayInfo = (
    totalHours: number,
    hasMorning: boolean,
    hasNight: boolean,
    isFieldDutyDay: boolean
  ): MealAllowanceDayInfo => ({
    totalHours,
    hasMorning,
    hasNight,
    isFieldDutyDay,
  });

  // Helper function to create MealAllowanceRates
  const createRates = (small: number, large: number): MealAllowanceRates => ({
    small,
    large,
  });

  // Helper function to create MealAllowanceEntry
  const createEntry = (
    points: number,
    amount: number
  ): MealAllowanceEntry => ({
    points,
    amount,
  });

  beforeEach(() => {
    // Create mock calculators
    mockLargeCalculator = {
      calculate: vi.fn(),
    } as unknown as LargeMealAllowanceCalculator;

    mockSmallCalculator = {
      calculate: vi.fn(),
    } as unknown as SmallMealAllowanceCalculator;

    resolver = new MealAllowanceResolver(
      mockLargeCalculator,
      mockSmallCalculator
    );
  });

  describe("createEmpty", () => {
    it("should return empty meal allowance with zero values", () => {
      const result = resolver.createEmpty();

      expect(result).toEqual({
        large: { points: 0, amount: 0 },
        small: { points: 0, amount: 0 },
      });
    });

    it("should return new object on each call", () => {
      const result1 = resolver.createEmpty();
      const result2 = resolver.createEmpty();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });

    it("should have correct structure", () => {
      const result = resolver.createEmpty();

      expect(result).toHaveProperty("large");
      expect(result).toHaveProperty("small");
      expect(result.large).toHaveProperty("points");
      expect(result.large).toHaveProperty("amount");
      expect(result.small).toHaveProperty("points");
      expect(result.small).toHaveProperty("amount");
    });

    it("should return immutable empty values", () => {
      const result = resolver.createEmpty();
      result.large.points = 999;
      result.small.amount = 999;

      const newResult = resolver.createEmpty();
      expect(newResult.large.points).toBe(0);
      expect(newResult.small.amount).toBe(0);
    });
  });

  describe("resolve - Large Meal Allowance Priority", () => {
    it("should return large meal allowance when large calculator returns points > 0", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result).toEqual({
        large: { points: 1, amount: 100 },
        small: { points: 0, amount: 0 },
      });
      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith({
        day,
        rate: 100,
      });
      expect(mockSmallCalculator.calculate).not.toHaveBeenCalled();
    });

    it("should not call small calculator when large returns points", () => {
      const day = createDayInfo(10, true, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledTimes(1);
      expect(mockSmallCalculator.calculate).not.toHaveBeenCalled();
    });

    it("should return large meal allowance with 2 points", () => {
      const day = createDayInfo(15, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(2, 200);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large).toEqual({ points: 2, amount: 200 });
      expect(result.small).toEqual({ points: 0, amount: 0 });
    });

    it("should handle high rate for large meal allowance", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(75, 150);
      const largeResult = createEntry(1, 150);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.amount).toBe(150);
      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith({
        day,
        rate: 150,
      });
    });

    it("should prioritize large even with 10 hours exactly", () => {
      const day = createDayInfo(10, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(1);
      expect(result.small.points).toBe(0);
    });
  });

  describe("resolve - Small Meal Allowance Fallback", () => {
    it("should return small meal allowance when large returns 0 points", () => {
      const day = createDayInfo(8, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result).toEqual({
        large: { points: 0, amount: 0 },
        small: { points: 1, amount: 50 },
      });
      expect(mockSmallCalculator.calculate).toHaveBeenCalledWith({
        day,
        rate: 50,
      });
    });

    it("should call small calculator only when large returns 0 points", () => {
      const day = createDayInfo(9, true, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledTimes(1);
      expect(mockSmallCalculator.calculate).toHaveBeenCalledTimes(1);
    });

    it("should return small meal allowance with 2 points", () => {
      const day = createDayInfo(8, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(2, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.small).toEqual({ points: 2, amount: 100 });
      expect(result.large).toEqual({ points: 0, amount: 0 });
    });

    it("should handle high rate for small meal allowance", () => {
      const day = createDayInfo(6, true, false, true);
      const rates = createRates(75, 150);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 75);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.small.amount).toBe(75);
      expect(mockSmallCalculator.calculate).toHaveBeenCalledWith({
        day,
        rate: 75,
      });
    });

    it("should handle case when both calculators return 0 points", () => {
      const day = createDayInfo(3, false, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result).toEqual({
        large: { points: 0, amount: 0 },
        small: { points: 0, amount: 0 },
      });
    });
  });

  describe("resolve - Calculator Parameter Passing", () => {
    it("should pass correct day info to large calculator", () => {
      const day = createDayInfo(12, true, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith({
        day: {
          totalHours: 12,
          hasMorning: true,
          hasNight: true,
          isFieldDutyDay: false,
        },
        rate: 100,
      });
    });

    it("should pass correct day info to small calculator", () => {
      const day = createDayInfo(6, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });

      expect(mockSmallCalculator.calculate).toHaveBeenCalledWith({
        day: {
          totalHours: 6,
          hasMorning: true,
          hasNight: false,
          isFieldDutyDay: true,
        },
        rate: 50,
      });
    });

    it("should handle field duty day correctly", () => {
      const day = createDayInfo(8, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ isFieldDutyDay: true }),
        })
      );
    });

    it("should handle non-field duty day correctly", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ isFieldDutyDay: false }),
        })
      );
    });
  });

  describe("resolve - Different Shift Types", () => {
    it("should handle night shift (no morning, has night)", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ hasMorning: false, hasNight: true }),
        })
      );
      expect(result.large.points).toBeGreaterThan(0);
    });

    it("should handle day shift (has morning, no night)", () => {
      const day = createDayInfo(10, true, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ hasMorning: true, hasNight: false }),
        })
      );
    });

    it("should handle cross-day shift (has both morning and night)", () => {
      const day = createDayInfo(12, true, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ hasMorning: true, hasNight: true }),
        })
      );
    });

    it("should handle no morning and no night shift", () => {
      const day = createDayInfo(5, false, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ hasMorning: false, hasNight: false }),
        })
      );
    });
  });

  describe("resolve - Various Hour Ranges", () => {
    it("should handle 0 hours", () => {
      const day = createDayInfo(0, false, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(0);
      expect(result.small.points).toBe(0);
    });

    it("should handle exactly 4 hours (small threshold)", () => {
      const day = createDayInfo(4, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ totalHours: 4 }),
        })
      );
    });

    it("should handle 6 hours", () => {
      const day = createDayInfo(6, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.small.points).toBe(1);
    });

    it("should handle 8 hours", () => {
      const day = createDayInfo(8, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ totalHours: 8 }),
        })
      );
    });

    it("should handle exactly 10 hours (large threshold)", () => {
      const day = createDayInfo(10, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(1);
    });

    it("should handle 12 hours", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ totalHours: 12 }),
        })
      );
    });

    it("should handle 24 hours", () => {
      const day = createDayInfo(24, true, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(1);
    });
  });

  describe("resolve - Rate Variations", () => {
    it("should handle low rates", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(10, 20);
      const largeResult = createEntry(1, 20);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.amount).toBe(20);
      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith({
        day,
        rate: 20,
      });
    });

    it("should handle high rates", () => {
      const day = createDayInfo(6, true, false, true);
      const rates = createRates(200, 400);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 200);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.small.amount).toBe(200);
      expect(mockSmallCalculator.calculate).toHaveBeenCalledWith({
        day,
        rate: 200,
      });
    });

    it("should handle equal rates for small and large", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(100, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.amount).toBe(100);
    });

    it("should handle zero rates", () => {
      const day = createDayInfo(6, true, false, true);
      const rates = createRates(0, 0);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.small.amount).toBe(0);
    });

    it("should handle fractional rates", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(47.5, 95.5);
      const largeResult = createEntry(1, 95.5);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.amount).toBe(95.5);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical 12-hour night shift without field duty", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result).toEqual({
        large: { points: 1, amount: 100 },
        small: { points: 0, amount: 0 },
      });
    });

    it("should handle typical 8-hour day shift with field duty", () => {
      const day = createDayInfo(8, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result).toEqual({
        large: { points: 0, amount: 0 },
        small: { points: 1, amount: 50 },
      });
    });

    it("should handle short shift with no allowance", () => {
      const day = createDayInfo(3, false, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result).toEqual({
        large: { points: 0, amount: 0 },
        small: { points: 0, amount: 0 },
      });
    });

    it("should handle 10-hour day shift without field duty", () => {
      const day = createDayInfo(10, true, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(1);
      expect(result.small.points).toBe(0);
    });

    it("should handle cross-day shift with field duty", () => {
      const day = createDayInfo(12, true, true, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(0);
      expect(result.small.points).toBe(0);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle negative hours (edge case)", () => {
      const day = createDayInfo(-1, false, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(0);
      expect(result.small.points).toBe(0);
    });

    it("should handle very large hours", () => {
      const day = createDayInfo(48, true, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(2, 200);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.points).toBe(2);
    });

    it("should handle negative rates (edge case)", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(-50, -100);
      const largeResult = createEntry(1, -100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result = resolver.resolve({ day, rates });

      expect(result.large.amount).toBe(-100);
    });

    it("should handle fractional hours", () => {
      const day = createDayInfo(10.5, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({ totalHours: 10.5 }),
        })
      );
    });
  });

  describe("Consistency and Determinism", () => {
    it("should return consistent results for same input", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const result1 = resolver.resolve({ day, rates });
      const result2 = resolver.resolve({ day, rates });
      const result3 = resolver.resolve({ day, rates });

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should call calculators independently", () => {
      const day = createDayInfo(8, true, false, true);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(1, 50);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      resolver.resolve({ day, rates });
      resolver.resolve({ day, rates });

      expect(mockLargeCalculator.calculate).toHaveBeenCalledTimes(2);
      expect(mockSmallCalculator.calculate).toHaveBeenCalledTimes(2);
    });

    it("should not modify input parameters", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);
      const originalDay = { ...day };
      const originalRates = { ...rates };

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      resolver.resolve({ day, rates });

      expect(day).toEqual(originalDay);
      expect(rates).toEqual(originalRates);
    });
  });

  describe("createEmpty and resolve interaction", () => {
    it("should return same structure as createEmpty when no allowance", () => {
      const day = createDayInfo(3, false, false, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(0, 0);
      const smallResult = createEntry(0, 0);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);
      vi.mocked(mockSmallCalculator.calculate).mockReturnValue(smallResult);

      const empty = resolver.createEmpty();
      const resolved = resolver.resolve({ day, rates });

      expect(resolved).toEqual(empty);
    });

    it("should have different values than createEmpty when allowance exists", () => {
      const day = createDayInfo(12, false, true, false);
      const rates = createRates(50, 100);
      const largeResult = createEntry(1, 100);

      vi.mocked(mockLargeCalculator.calculate).mockReturnValue(largeResult);

      const empty = resolver.createEmpty();
      const resolved = resolver.resolve({ day, rates });

      expect(resolved).not.toEqual(empty);
      expect(resolved.large.points).toBeGreaterThan(empty.large.points);
    });
  });
});
