import { describe, it, expect, beforeEach } from "vitest";
import { DefaultPerDiemMonthCalculator } from "@/domain/calculator/perdiem/perdiem-month.calculator";
import type { PerDiemInfo } from "@/domain/types/data-shapes";

describe("DefaultPerDiemMonthCalculator", () => {
  let calculator: DefaultPerDiemMonthCalculator;

  beforeEach(() => {
    calculator = new DefaultPerDiemMonthCalculator();
  });

  describe("createEmpty", () => {
    it("should create empty PerDiemInfo with null tier and 0 values", () => {
      const result = calculator.createEmpty();

      expect(result).toEqual({
        tier: null,
        points: 0,
        amount: 0,
      });
    });

    it("should return a new object each time", () => {
      const result1 = calculator.createEmpty();
      const result2 = calculator.createEmpty();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe("accumulate", () => {
    describe("basic accumulation", () => {
      it("should accumulate points and amounts from tier A days", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 0,
          amount: 0,
        };

        const add: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 1,
          amount: 100,
        });
      });

      it("should accumulate points and amounts from tier B days", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 0,
          amount: 0,
        };

        const add: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 2,
          amount: 200,
        });
      });

      it("should accumulate points and amounts from tier C days", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 0,
          amount: 0,
        };

        const add: PerDiemInfo = {
          tier: "C",
          points: 3,
          amount: 300,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 3,
          amount: 300,
        });
      });
    });

    describe("multiple accumulations", () => {
      it("should accumulate multiple tier A days", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 100,
        };

        const add: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 2,
          amount: 200,
        });
      });

      it("should accumulate mixed tiers (A + B)", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 100,
        };

        const add: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 3,
          amount: 300,
        });
      });

      it("should accumulate mixed tiers (B + C)", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 2,
          amount: 200,
        };

        const add: PerDiemInfo = {
          tier: "C",
          points: 3,
          amount: 300,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 5,
          amount: 500,
        });
      });

      it("should accumulate many days over a month", () => {
        let result: PerDiemInfo = calculator.createEmpty();

        // 5 tier A days
        for (let i = 0; i < 5; i++) {
          result = calculator.accumulate(result, {
            tier: "A" as const,
            points: 1,
            amount: 100,
          });
        }

        // 10 tier B days
        for (let i = 0; i < 10; i++) {
          result = calculator.accumulate(result, {
            tier: "B" as const,
            points: 2,
            amount: 200,
          });
        }

        // 5 tier C days
        for (let i = 0; i < 5; i++) {
          result = calculator.accumulate(result, {
            tier: "C" as const,
            points: 3,
            amount: 300,
          });
        }

        expect(result).toEqual({
          tier: null,
          points: 40, // 5*1 + 10*2 + 5*3 = 5 + 20 + 15 = 40
          amount: 4000, // 5*100 + 10*200 + 5*300 = 500 + 2000 + 1500 = 4000
        });
      });
    });

    describe("tier handling", () => {
      it("should always set tier to null in result", () => {
        const base: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const add: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const result = calculator.accumulate(base, add);

        expect(result.tier).toBe(null);
        expect(result.points).toBe(3);
        expect(result.amount).toBe(300);
      });

      it("should set tier to null even when base has tier", () => {
        const base: PerDiemInfo = {
          tier: "C",
          points: 5,
          amount: 500,
        };

        const add: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const result = calculator.accumulate(base, add);

        expect(result.tier).toBe(null);
        expect(result.points).toBe(6);
        expect(result.amount).toBe(600);
      });
    });

    describe("zero and decimal values", () => {
      it("should handle zero points and amounts", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 5,
          amount: 500,
        };

        const add: PerDiemInfo = {
          tier: null,
          points: 0,
          amount: 0,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 5,
          amount: 500,
        });
      });

      it("should handle decimal amounts", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 75.5,
        };

        const add: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 75.5,
        };

        const result = calculator.accumulate(base, add);

        expect(result).toEqual({
          tier: null,
          points: 2,
          amount: 151,
        });
      });
    });

    describe("immutability", () => {
      it("should not modify the base object", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 100,
        };

        const originalBase = { ...base };

        calculator.accumulate(base, {
          tier: "A",
          points: 1,
          amount: 100,
        });

        expect(base).toEqual(originalBase);
      });

      it("should not modify the add object", () => {
        const add: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const originalAdd = { ...add };

        calculator.accumulate(
          {
            tier: null,
            points: 1,
            amount: 100,
          },
          add
        );

        expect(add).toEqual(originalAdd);
      });
    });
  });

  describe("subtract", () => {
    describe("basic subtraction", () => {
      it("should subtract points and amounts", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 5,
          amount: 500,
        };

        const sub: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 4,
          amount: 400,
        });
      });

      it("should subtract tier B values", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 10,
          amount: 1000,
        };

        const sub: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 8,
          amount: 800,
        });
      });

      it("should subtract tier C values", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 20,
          amount: 2000,
        };

        const sub: PerDiemInfo = {
          tier: "C",
          points: 3,
          amount: 300,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 17,
          amount: 1700,
        });
      });
    });

    describe("preventing negative values", () => {
      it("should not allow negative points", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 100,
        };

        const sub: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const result = calculator.subtract(base, sub);

        expect(result.points).toBe(0);
        expect(result.points).toBeGreaterThanOrEqual(0);
      });

      it("should not allow negative amounts", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 100,
        };

        const sub: PerDiemInfo = {
          tier: "C",
          points: 3,
          amount: 300,
        };

        const result = calculator.subtract(base, sub);

        expect(result.amount).toBe(0);
        expect(result.amount).toBeGreaterThanOrEqual(0);
      });

      it("should clamp both points and amounts to 0", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 2,
          amount: 200,
        };

        const sub: PerDiemInfo = {
          tier: "C",
          points: 10,
          amount: 1000,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 0,
          amount: 0,
        });
      });
    });

    describe("zero values", () => {
      it("should handle subtracting zero", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 5,
          amount: 500,
        };

        const sub: PerDiemInfo = {
          tier: null,
          points: 0,
          amount: 0,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 5,
          amount: 500,
        });
      });

      it("should handle subtracting from zero", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 0,
          amount: 0,
        };

        const sub: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 0,
          amount: 0,
        });
      });
    });

    describe("decimal values", () => {
      it("should handle decimal amounts", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 5,
          amount: 500.75,
        };

        const sub: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 75.5,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 4,
          amount: 425.25,
        });
      });

      it("should clamp negative decimal results to 0", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 1,
          amount: 75.5,
        };

        const sub: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200.75,
        };

        const result = calculator.subtract(base, sub);

        expect(result).toEqual({
          tier: null,
          points: 0,
          amount: 0,
        });
      });
    });

    describe("tier handling", () => {
      it("should always set tier to null in result", () => {
        const base: PerDiemInfo = {
          tier: "C",
          points: 5,
          amount: 500,
        };

        const sub: PerDiemInfo = {
          tier: "A",
          points: 1,
          amount: 100,
        };

        const result = calculator.subtract(base, sub);

        expect(result.tier).toBe(null);
      });
    });

    describe("immutability", () => {
      it("should not modify the base object", () => {
        const base: PerDiemInfo = {
          tier: null,
          points: 5,
          amount: 500,
        };

        const originalBase = { ...base };

        calculator.subtract(base, {
          tier: "A",
          points: 1,
          amount: 100,
        });

        expect(base).toEqual(originalBase);
      });

      it("should not modify the sub object", () => {
        const sub: PerDiemInfo = {
          tier: "B",
          points: 2,
          amount: 200,
        };

        const originalSub = { ...sub };

        calculator.subtract(
          {
            tier: null,
            points: 5,
            amount: 500,
          },
          sub
        );

        expect(sub).toEqual(originalSub);
      });
    });
  });

  describe("combined operations", () => {
    it("should handle accumulate followed by subtract", () => {
      let result: PerDiemInfo = calculator.createEmpty();

      // Accumulate 3 tier B days
      result = calculator.accumulate(result, {
        tier: "B" as const,
        points: 2,
        amount: 200,
      });
      result = calculator.accumulate(result, {
        tier: "B" as const,
        points: 2,
        amount: 200,
      });
      result = calculator.accumulate(result, {
        tier: "B" as const,
        points: 2,
        amount: 200,
      });

      expect(result).toEqual({
        tier: null,
        points: 6,
        amount: 600,
      });

      // Subtract 1 tier A day
      result = calculator.subtract(result, {
        tier: "A" as const,
        points: 1,
        amount: 100,
      });

      expect(result).toEqual({
        tier: null,
        points: 5,
        amount: 500,
      });
    });

    it("should handle multiple accumulate and subtract operations", () => {
      let result: PerDiemInfo = calculator.createEmpty();

      // Add some days
      result = calculator.accumulate(result, {
        tier: "C" as const,
        points: 3,
        amount: 300,
      });
      result = calculator.accumulate(result, {
        tier: "B" as const,
        points: 2,
        amount: 200,
      });

      // Remove a day
      result = calculator.subtract(result, {
        tier: "A" as const,
        points: 1,
        amount: 100,
      });

      // Add more
      result = calculator.accumulate(result, {
        tier: "A" as const,
        points: 1,
        amount: 100,
      });

      expect(result).toEqual({
        tier: null,
        points: 5, // 3 + 2 - 1 + 1 = 5
        amount: 500, // 300 + 200 - 100 + 100 = 500
      });
    });
  });
});
