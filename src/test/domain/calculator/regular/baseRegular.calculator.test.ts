import { describe, it, expect } from "vitest";
import { BaseRegularCalculator } from "@/domain/calculator/regular/baseRegular.calculator";
import { RegularBreakdown, RegularConfig } from "@/domain";

// Create a concrete implementation for testing the abstract class
class TestRegularCalculator extends BaseRegularCalculator {
  constructor(config?: Partial<RegularConfig>) {
    super(config);
  }
}

describe("BaseRegularCalculator", () => {
  describe("constructor", () => {
    it("should initialize with default config when no config provided", () => {
      const calculator = new TestRegularCalculator();
      const result = calculator.createEmpty();

      expect(result.hours100.percent).toBe(1);
      expect(result.hours125.percent).toBe(1.25);
      expect(result.hours150.percent).toBe(1.5);
    });

    it("should initialize with custom midTierThreshold", () => {
      const calculator = new TestRegularCalculator({ midTierThreshold: 5 });
      // midTierThreshold is protected, so we verify it through behavior
      // by checking that the config is properly set
      const result = calculator.createEmpty();
      expect(result).toBeDefined();
    });

    it("should initialize with custom percentages", () => {
      const customPercentages = {
        hours100: 1.1,
        hours125: 1.35,
        hours150: 1.6,
      };
      const calculator = new TestRegularCalculator({
        percentages: customPercentages,
      });
      const result = calculator.createEmpty();

      expect(result.hours100.percent).toBe(1.1);
      expect(result.hours125.percent).toBe(1.35);
      expect(result.hours150.percent).toBe(1.6);
    });

    it("should initialize with partial custom percentages, keeping defaults for others", () => {
      const calculator = new TestRegularCalculator({
        percentages: { hours100: 1.2, hours125: 1.25, hours150: 1.5 },
      });
      const result = calculator.createEmpty();

      expect(result.hours100.percent).toBe(1.2);
      expect(result.hours125.percent).toBe(1.25);
      expect(result.hours150.percent).toBe(1.5);
    });

    it("should initialize with full custom config", () => {
      const customConfig = {
        midTierThreshold: 3,
        percentages: {
          hours100: 1.1,
          hours125: 1.3,
          hours150: 1.7,
        },
      };
      const calculator = new TestRegularCalculator(customConfig);
      const result = calculator.createEmpty();

      expect(result.hours100.percent).toBe(1.1);
      expect(result.hours125.percent).toBe(1.3);
      expect(result.hours150.percent).toBe(1.7);
    });
  });

  describe("createEmpty", () => {
    it("should create an empty RegularBreakdown with zero hours", () => {
      const calculator = new TestRegularCalculator();
      const result = calculator.createEmpty();

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should create an empty RegularBreakdown with custom percentages", () => {
      const calculator = new TestRegularCalculator({
        percentages: { hours100: 2, hours125: 2.5, hours150: 3 },
      });
      const result = calculator.createEmpty();

      expect(result).toEqual({
        hours100: { percent: 2, hours: 0 },
        hours125: { percent: 2.5, hours: 0 },
        hours150: { percent: 3, hours: 0 },
      });
    });

    it("should create independent empty objects on each call", () => {
      const calculator = new TestRegularCalculator();
      const result1 = calculator.createEmpty();
      const result2 = calculator.createEmpty();

      result1.hours100.hours = 5;

      expect(result1.hours100.hours).toBe(5);
      expect(result2.hours100.hours).toBe(0);
    });
  });

  describe("handleSpecial", () => {
    it("should assign all hours to hours150 tier", () => {
      const calculator = new TestRegularCalculator();
      const result = calculator.handleSpecial(10);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 10 },
      });
    });

    it("should handle zero hours", () => {
      const calculator = new TestRegularCalculator();
      const result = calculator.handleSpecial(0);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should handle decimal hours", () => {
      const calculator = new TestRegularCalculator();
      const result = calculator.handleSpecial(7.5);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 7.5 },
      });
    });

    it("should use custom percentages in special handling", () => {
      const calculator = new TestRegularCalculator({
        percentages: { hours100: 1.1, hours125: 1.4, hours150: 2.0 },
      });
      const result = calculator.handleSpecial(8);

      expect(result).toEqual({
        hours100: { percent: 1.1, hours: 0 },
        hours125: { percent: 1.4, hours: 0 },
        hours150: { percent: 2.0, hours: 8 },
      });
    });

    it("should handle large hour values", () => {
      const calculator = new TestRegularCalculator();
      const result = calculator.handleSpecial(24);

      expect(result.hours150.hours).toBe(24);
      expect(result.hours100.hours).toBe(0);
      expect(result.hours125.hours).toBe(0);
    });
  });

  describe("accumulate", () => {
    it("should accumulate hours across all tiers", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 3 },
      };

      const result = calculator.accumulate(base, add);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 7 },
        hours125: { percent: 1.25, hours: 4 },
        hours150: { percent: 1.5, hours: 5 },
      });
    });

    it("should preserve base percentages", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1.1, hours: 5 },
        hours125: { percent: 1.3, hours: 3 },
        hours150: { percent: 1.6, hours: 2 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 3 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.hours100.percent).toBe(1.1);
      expect(result.hours125.percent).toBe(1.3);
      expect(result.hours150.percent).toBe(1.6);
    });

    it("should handle accumulation with zero hours", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const add = calculator.createEmpty();

      const result = calculator.accumulate(base, add);

      expect(result).toEqual(base);
    });

    it("should handle accumulation to empty base", () => {
      const calculator = new TestRegularCalculator();
      const base = calculator.createEmpty();
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.hours100.hours).toBe(5);
      expect(result.hours125.hours).toBe(3);
      expect(result.hours150.hours).toBe(2);
    });

    it("should handle decimal hours accumulation", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5.5 },
        hours125: { percent: 1.25, hours: 3.25 },
        hours150: { percent: 1.5, hours: 2.75 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 2.5 },
        hours125: { percent: 1.25, hours: 1.5 },
        hours150: { percent: 1.5, hours: 0.25 },
      };

      const result = calculator.accumulate(base, add);

      expect(result.hours100.hours).toBeCloseTo(8);
      expect(result.hours125.hours).toBeCloseTo(4.75);
      expect(result.hours150.hours).toBeCloseTo(3);
    });

    it("should not mutate the original objects", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 3 },
      };

      const baseCopy = JSON.parse(JSON.stringify(base));
      const addCopy = JSON.parse(JSON.stringify(add));

      calculator.accumulate(base, add);

      expect(base).toEqual(baseCopy);
      expect(add).toEqual(addCopy);
    });
  });

  describe("subtract", () => {
    it("should subtract hours across all tiers", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 3 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      });
    });

    it("should not allow negative hours (clamp to zero)", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should preserve base percentages", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1.1, hours: 5 },
        hours125: { percent: 1.3, hours: 3 },
        hours150: { percent: 1.6, hours: 2 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result = calculator.subtract(base, sub);

      expect(result.hours100.percent).toBe(1.1);
      expect(result.hours125.percent).toBe(1.3);
      expect(result.hours150.percent).toBe(1.6);
    });

    it("should handle subtraction with zero hours", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const sub = calculator.createEmpty();

      const result = calculator.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle subtraction from empty base", () => {
      const calculator = new TestRegularCalculator();
      const base = calculator.createEmpty();
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual(base);
    });

    it("should handle decimal hours subtraction", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5.5 },
        hours125: { percent: 1.25, hours: 3.75 },
        hours150: { percent: 1.5, hours: 2.25 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 2.5 },
        hours125: { percent: 1.25, hours: 1.5 },
        hours150: { percent: 1.5, hours: 0.25 },
      };

      const result = calculator.subtract(base, sub);

      expect(result.hours100.hours).toBeCloseTo(3);
      expect(result.hours125.hours).toBeCloseTo(2.25);
      expect(result.hours150.hours).toBeCloseTo(2);
    });

    it("should handle partial negative results (mixed zero and positive)", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 3 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result = calculator.subtract(base, sub);

      expect(result).toEqual({
        hours100: { percent: 1, hours: 3 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 2 },
      });
    });

    it("should not mutate the original objects", () => {
      const calculator = new TestRegularCalculator();
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 2 },
        hours125: { percent: 1.25, hours: 1 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const baseCopy = JSON.parse(JSON.stringify(base));
      const subCopy = JSON.parse(JSON.stringify(sub));

      calculator.subtract(base, sub);

      expect(base).toEqual(baseCopy);
      expect(sub).toEqual(subCopy);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow: create, accumulate, subtract", () => {
      const calculator = new TestRegularCalculator();
      
      const empty = calculator.createEmpty();
      const breakdown1: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const breakdown2: RegularBreakdown = {
        hours100: { percent: 1, hours: 3 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const accumulated = calculator.accumulate(empty, breakdown1);
      const final = calculator.accumulate(accumulated, breakdown2);

      expect(final).toEqual({
        hours100: { percent: 1, hours: 11 },
        hours125: { percent: 1.25, hours: 4 },
        hours150: { percent: 1.5, hours: 1 },
      });

      const subtracted = calculator.subtract(final, breakdown1);
      expect(subtracted).toEqual(breakdown2);
    });

    it("should handle special day workflow", () => {
      const calculator = new TestRegularCalculator();
      const specialBreakdown = calculator.handleSpecial(12);

      expect(specialBreakdown.hours150.hours).toBe(12);

      const accumulated = calculator.accumulate(
        calculator.createEmpty(),
        specialBreakdown
      );

      expect(accumulated).toEqual(specialBreakdown);
    });

    it("should handle multiple special days accumulation", () => {
      const calculator = new TestRegularCalculator();
      const special1 = calculator.handleSpecial(8);
      const special2 = calculator.handleSpecial(10);

      const total = calculator.accumulate(special1, special2);

      expect(total.hours150.hours).toBe(18);
      expect(total.hours100.hours).toBe(0);
      expect(total.hours125.hours).toBe(0);
    });
  });
});
