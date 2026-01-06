import { describe, it, expect, beforeEach } from "vitest";
import { MealAllowanceMonthReducer } from "@/domain/reducer/meal-allowance-month.reducer";
import type { MealAllowance } from "@/domain";

describe("MealAllowanceMonthReducer", () => {
  let reducer: MealAllowanceMonthReducer;

  beforeEach(() => {
    reducer = new MealAllowanceMonthReducer();
  });

  describe("createEmpty", () => {
    it("should create an empty meal allowance with zero values", () => {
      const result = reducer.createEmpty();

      expect(result).toEqual({
        large: { points: 0, amount: 0 },
        small: { points: 0, amount: 0 },
      });
    });

    it("should return a new object each time", () => {
      const result1 = reducer.createEmpty();
      const result2 = reducer.createEmpty();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should have both large and small properties", () => {
      const result = reducer.createEmpty();

      expect(result).toHaveProperty("large");
      expect(result).toHaveProperty("small");
    });

    it("should have points and amount in both large and small", () => {
      const result = reducer.createEmpty();

      expect(result.large).toHaveProperty("points");
      expect(result.large).toHaveProperty("amount");
      expect(result.small).toHaveProperty("points");
      expect(result.small).toHaveProperty("amount");
    });

    it("should have all numeric values", () => {
      const result = reducer.createEmpty();

      expect(typeof result.large.points).toBe("number");
      expect(typeof result.large.amount).toBe("number");
      expect(typeof result.small.points).toBe("number");
      expect(typeof result.small.amount).toBe("number");
    });
  });

  describe("accumulate", () => {
    it("should accumulate large meal allowance points", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 0, amount: 0 },
      };
      const add: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 0, amount: 0 },
      };

      const result = reducer.accumulate(base, add);

      expect(result.large.points).toBe(8);
      expect(result.large.amount).toBe(160);
    });

    it("should accumulate small meal allowance points", () => {
      const base: MealAllowance = {
        large: { points: 0, amount: 0 },
        small: { points: 4, amount: 50 },
      };
      const add: MealAllowance = {
        large: { points: 0, amount: 0 },
        small: { points: 2, amount: 25 },
      };

      const result = reducer.accumulate(base, add);

      expect(result.small.points).toBe(6);
      expect(result.small.amount).toBe(75);
    });

    it("should accumulate both large and small allowances", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };
      const add: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 2, amount: 25 },
      };

      const result = reducer.accumulate(base, add);

      expect(result.large.points).toBe(8);
      expect(result.large.amount).toBe(160);
      expect(result.small.points).toBe(6);
      expect(result.small.amount).toBe(75);
    });

    it("should handle accumulating empty allowance", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };
      const add = reducer.createEmpty();

      const result = reducer.accumulate(base, add);

      expect(result).toEqual(base);
    });

    it("should handle accumulating to empty allowance", () => {
      const base = reducer.createEmpty();
      const add: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };

      const result = reducer.accumulate(base, add);

      expect(result).toEqual(add);
    });

    it("should handle decimal values", () => {
      const base: MealAllowance = {
        large: { points: 2.5, amount: 52.75 },
        small: { points: 1.3, amount: 21.1 },
      };
      const add: MealAllowance = {
        large: { points: 1.5, amount: 31.5 },
        small: { points: 0.7, amount: 14.3 },
      };

      const result = reducer.accumulate(base, add);

      expect(result.large.points).toBeCloseTo(4.0, 1);
      expect(result.large.amount).toBeCloseTo(84.25, 2);
      expect(result.small.points).toBeCloseTo(2.0, 1);
      expect(result.small.amount).toBeCloseTo(35.4, 2);
    });

    it("should not mutate the base object", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };
      const baseCopy = { ...base, large: { ...base.large }, small: { ...base.small } };
      const add: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 2, amount: 25 },
      };

      reducer.accumulate(base, add);

      expect(base).toEqual(baseCopy);
    });

    it("should handle large numbers", () => {
      const base: MealAllowance = {
        large: { points: 1000, amount: 21000 },
        small: { points: 500, amount: 6500 },
      };
      const add: MealAllowance = {
        large: { points: 500, amount: 10500 },
        small: { points: 250, amount: 3250 },
      };

      const result = reducer.accumulate(base, add);

      expect(result.large.points).toBe(1500);
      expect(result.large.amount).toBe(31500);
      expect(result.small.points).toBe(750);
      expect(result.small.amount).toBe(9750);
    });

    it("should be associative", () => {
      const a: MealAllowance = {
        large: { points: 1, amount: 21 },
        small: { points: 2, amount: 26 },
      };
      const b: MealAllowance = {
        large: { points: 3, amount: 63 },
        small: { points: 4, amount: 52 },
      };
      const c: MealAllowance = {
        large: { points: 5, amount: 105 },
        small: { points: 6, amount: 78 },
      };

      const result1 = reducer.accumulate(reducer.accumulate(a, b), c);
      const result2 = reducer.accumulate(a, reducer.accumulate(b, c));

      expect(result1).toEqual(result2);
    });

    it("should be commutative", () => {
      const a: MealAllowance = {
        large: { points: 2, amount: 42 },
        small: { points: 3, amount: 39 },
      };
      const b: MealAllowance = {
        large: { points: 4, amount: 84 },
        small: { points: 5, amount: 65 },
      };

      const result1 = reducer.accumulate(a, b);
      const result2 = reducer.accumulate(b, a);

      expect(result1).toEqual(result2);
    });
  });

  describe("subtract", () => {
    it("should subtract large meal allowance points", () => {
      const base: MealAllowance = {
        large: { points: 8, amount: 160 },
        small: { points: 0, amount: 0 },
      };
      const sub: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 0, amount: 0 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.large.points).toBe(5);
      expect(result.large.amount).toBe(100);
    });

    it("should subtract small meal allowance points", () => {
      const base: MealAllowance = {
        large: { points: 0, amount: 0 },
        small: { points: 6, amount: 75 },
      };
      const sub: MealAllowance = {
        large: { points: 0, amount: 0 },
        small: { points: 2, amount: 25 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.small.points).toBe(4);
      expect(result.small.amount).toBe(50);
    });

    it("should subtract both large and small allowances", () => {
      const base: MealAllowance = {
        large: { points: 8, amount: 160 },
        small: { points: 6, amount: 75 },
      };
      const sub: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 2, amount: 25 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.large.points).toBe(5);
      expect(result.large.amount).toBe(100);
      expect(result.small.points).toBe(4);
      expect(result.small.amount).toBe(50);
    });

    it("should not go below zero for points", () => {
      const base: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 2, amount: 25 },
      };
      const sub: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.large.points).toBe(0);
      expect(result.small.points).toBe(0);
    });

    it("should not go below zero for amounts", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 60 },
        small: { points: 4, amount: 25 },
      };
      const sub: MealAllowance = {
        large: { points: 3, amount: 100 },
        small: { points: 2, amount: 50 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.large.amount).toBe(0);
      expect(result.small.amount).toBe(0);
    });

    it("should handle subtracting empty allowance", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };
      const sub = reducer.createEmpty();

      const result = reducer.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle subtracting from empty allowance", () => {
      const base = reducer.createEmpty();
      const sub: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };

      const result = reducer.subtract(base, sub);

      expect(result).toEqual(reducer.createEmpty());
    });

    it("should handle decimal values", () => {
      const base: MealAllowance = {
        large: { points: 4.0, amount: 84.25 },
        small: { points: 2.0, amount: 35.4 },
      };
      const sub: MealAllowance = {
        large: { points: 1.5, amount: 31.5 },
        small: { points: 0.7, amount: 14.3 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.large.points).toBeCloseTo(2.5, 1);
      expect(result.large.amount).toBeCloseTo(52.75, 2);
      expect(result.small.points).toBeCloseTo(1.3, 1);
      expect(result.small.amount).toBeCloseTo(21.1, 2);
    });

    it("should not mutate the base object", () => {
      const base: MealAllowance = {
        large: { points: 8, amount: 160 },
        small: { points: 6, amount: 75 },
      };
      const baseCopy = { ...base, large: { ...base.large }, small: { ...base.small } };
      const sub: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 2, amount: 25 },
      };

      reducer.subtract(base, sub);

      expect(base).toEqual(baseCopy);
    });

    it("should be inverse of accumulate", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };
      const delta: MealAllowance = {
        large: { points: 3, amount: 60 },
        small: { points: 2, amount: 25 },
      };

      const accumulated = reducer.accumulate(base, delta);
      const result = reducer.subtract(accumulated, delta);

      expect(result).toEqual(base);
    });

    it("should handle exact subtraction to zero", () => {
      const base: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 4, amount: 50 },
      };

      const result = reducer.subtract(base, base);

      expect(result).toEqual(reducer.createEmpty());
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle multiple accumulations", () => {
      let result = reducer.createEmpty();

      result = reducer.accumulate(result, {
        large: { points: 1, amount: 21 },
        small: { points: 0, amount: 0 },
      });
      result = reducer.accumulate(result, {
        large: { points: 0, amount: 0 },
        small: { points: 2, amount: 26 },
      });
      result = reducer.accumulate(result, {
        large: { points: 1, amount: 21 },
        small: { points: 1, amount: 13 },
      });

      expect(result.large.points).toBe(2);
      expect(result.large.amount).toBe(42);
      expect(result.small.points).toBe(3);
      expect(result.small.amount).toBe(39);
    });

    it("should handle monthly meal allowance calculation", () => {
      let monthTotal = reducer.createEmpty();

      // Week 1
      for (let i = 0; i < 5; i++) {
        monthTotal = reducer.accumulate(monthTotal, {
          large: { points: 1, amount: 21.1 },
          small: { points: 0, amount: 0 },
        });
      }

      // Week 2
      for (let i = 0; i < 5; i++) {
        monthTotal = reducer.accumulate(monthTotal, {
          large: { points: 0, amount: 0 },
          small: { points: 1, amount: 14.5 },
        });
      }

      expect(monthTotal.large.points).toBe(5);
      expect(monthTotal.large.amount).toBeCloseTo(105.5, 1);
      expect(monthTotal.small.points).toBe(5);
      expect(monthTotal.small.amount).toBeCloseTo(72.5, 1);
    });

    it("should handle shift removal from monthly total", () => {
      const monthTotal: MealAllowance = {
        large: { points: 20, amount: 422 },
        small: { points: 10, amount: 145 },
      };

      const removedDay: MealAllowance = {
        large: { points: 2, amount: 42.2 },
        small: { points: 0, amount: 0 },
      };

      const result = reducer.subtract(monthTotal, removedDay);

      expect(result.large.points).toBe(18);
      expect(result.large.amount).toBeCloseTo(379.8, 1);
      expect(result.small.points).toBe(10);
      expect(result.small.amount).toBe(145);
    });

    it("should handle mixed large and small meals in one day", () => {
      let dayTotal = reducer.createEmpty();

      // Morning shift - small meal
      dayTotal = reducer.accumulate(dayTotal, {
        large: { points: 0, amount: 0 },
        small: { points: 0.5, amount: 7.25 },
      });

      // Evening shift - large meal
      dayTotal = reducer.accumulate(dayTotal, {
        large: { points: 1, amount: 21.1 },
        small: { points: 0, amount: 0 },
      });

      expect(dayTotal.large.points).toBe(1);
      expect(dayTotal.large.amount).toBe(21.1);
      expect(dayTotal.small.points).toBe(0.5);
      expect(dayTotal.small.amount).toBe(7.25);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values", () => {
      const base = reducer.createEmpty();
      const add = reducer.createEmpty();

      const result = reducer.accumulate(base, add);

      expect(result).toEqual(reducer.createEmpty());
    });

    it("should handle very small decimal values", () => {
      const base: MealAllowance = {
        large: { points: 0.01, amount: 0.21 },
        small: { points: 0.01, amount: 0.15 },
      };
      const add: MealAllowance = {
        large: { points: 0.02, amount: 0.42 },
        small: { points: 0.02, amount: 0.29 },
      };

      const result = reducer.accumulate(base, add);

      expect(result.large.points).toBeCloseTo(0.03, 2);
      expect(result.large.amount).toBeCloseTo(0.63, 2);
    });

    it("should handle negative amounts clamped to zero", () => {
      const base: MealAllowance = {
        large: { points: 0, amount: 0 },
        small: { points: 0, amount: 0 },
      };
      const sub: MealAllowance = {
        large: { points: 5, amount: 100 },
        small: { points: 5, amount: 100 },
      };

      const result = reducer.subtract(base, sub);

      expect(result.large.points).toBe(0);
      expect(result.large.amount).toBe(0);
      expect(result.small.points).toBe(0);
      expect(result.small.amount).toBe(0);
    });

    it("should maintain precision with floating point arithmetic", () => {
      let result = reducer.createEmpty();

      for (let i = 0; i < 10; i++) {
        result = reducer.accumulate(result, {
          large: { points: 0.1, amount: 2.11 },
          small: { points: 0.1, amount: 1.45 },
        });
      }

      expect(result.large.points).toBeCloseTo(1.0, 1);
      expect(result.large.amount).toBeCloseTo(21.1, 1);
      expect(result.small.points).toBeCloseTo(1.0, 1);
      expect(result.small.amount).toBeCloseTo(14.5, 1);
    });
  });

  describe("Type Safety and Structure", () => {
    it("should maintain MealAllowance type structure", () => {
      const result = reducer.createEmpty();

      expect(result).toMatchObject({
        large: { points: expect.any(Number), amount: expect.any(Number) },
        small: { points: expect.any(Number), amount: expect.any(Number) },
      });
    });

    it("should return consistent structure across all methods", () => {
      const empty = reducer.createEmpty();
      const accumulated = reducer.accumulate(empty, {
        large: { points: 1, amount: 21 },
        small: { points: 1, amount: 14 },
      });
      const subtracted = reducer.subtract(accumulated, {
        large: { points: 0.5, amount: 10 },
        small: { points: 0.5, amount: 7 },
      });

      [empty, accumulated, subtracted].forEach((result) => {
        expect(Object.keys(result).sort()).toEqual(["large", "small"]);
        expect(Object.keys(result.large).sort()).toEqual(["amount", "points"]);
        expect(Object.keys(result.small).sort()).toEqual(["amount", "points"]);
      });
    });
  });
});
