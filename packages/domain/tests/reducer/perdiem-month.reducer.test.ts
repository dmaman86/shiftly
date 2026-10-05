import { describe, it, expect, beforeEach } from "vitest";
import { DefaultPerDiemMonthReducer } from "../../src/reducer/perdiem-month.reducer.js";
import type { PerDiemInfo } from "../../src/types/data-shapes.js";

describe("DefaultPerDiemMonthReducer", () => {
  let calculator: DefaultPerDiemMonthReducer;

  beforeEach(() => {
    calculator = new DefaultPerDiemMonthReducer();
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
          add,
        );

        expect(add).toEqual(originalAdd);
      });
    });
  });
});
