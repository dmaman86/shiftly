import { describe, it, expect, beforeEach } from "vitest";
import { RegularByMonthAccumulator } from "@/domain/reducer/regular-accumulator.reducer";
import type { RegularBreakdown, RegularConfig } from "@/domain";

describe("RegularByMonthAccumulator", () => {
  let accumulator: RegularByMonthAccumulator;

  beforeEach(() => {
    accumulator = new RegularByMonthAccumulator();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const acc = new RegularByMonthAccumulator();
      const empty = acc.createEmpty();

      expect(empty.hours100.percent).toBe(1);
      expect(empty.hours125.percent).toBe(1.25);
      expect(empty.hours150.percent).toBe(1.5);
    });

    it("should accept custom percentages", () => {
      const acc = new RegularByMonthAccumulator({
        percentages: {
          hours100: 1.0,
          hours125: 1.3,
          hours150: 1.6,
        },
      });
      const empty = acc.createEmpty();

      expect(empty.hours100.percent).toBe(1.0);
      expect(empty.hours125.percent).toBe(1.3);
      expect(empty.hours150.percent).toBe(1.6);
    });

    it("should accept custom midTierThreshold", () => {
      const acc = new RegularByMonthAccumulator({
        midTierThreshold: 3,
      });

      // The midTierThreshold is stored but not directly testable
      // We verify it doesn't break the accumulator
      const empty = acc.createEmpty();
      expect(empty).toBeDefined();
    });

    it("should accept partial config", () => {
      const acc = new RegularByMonthAccumulator({
        percentages: {
          hours100: 1,
          hours125: 1.3,
          hours150: 1.5,
        },
      });
      const empty = acc.createEmpty();

      expect(empty.hours100.percent).toBe(1); // default
      expect(empty.hours125.percent).toBe(1.3); // custom
      expect(empty.hours150.percent).toBe(1.5); // default
    });
  });

  describe("createEmpty", () => {
    it("should create empty regular breakdown with zero hours", () => {
      const result = accumulator.createEmpty();

      expect(result).toEqual({
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      });
    });

    it("should return a new object each time", () => {
      const result1 = accumulator.createEmpty();
      const result2 = accumulator.createEmpty();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should have all three hour tiers", () => {
      const result = accumulator.createEmpty();

      expect(result).toHaveProperty("hours100");
      expect(result).toHaveProperty("hours125");
      expect(result).toHaveProperty("hours150");
    });

    it("should have percent and hours in each tier", () => {
      const result = accumulator.createEmpty();

      Object.values(result).forEach((tier) => {
        expect(tier).toHaveProperty("percent");
        expect(tier).toHaveProperty("hours");
      });
    });

    it("should have correct default percentages", () => {
      const result = accumulator.createEmpty();

      expect(result.hours100.percent).toBe(1);
      expect(result.hours125.percent).toBe(1.25);
      expect(result.hours150.percent).toBe(1.5);
    });
  });

  describe("handleSpecial", () => {
    it("should put all hours in hours150 tier", () => {
      const result = accumulator.handleSpecial(8);

      expect(result.hours100.hours).toBe(0);
      expect(result.hours125.hours).toBe(0);
      expect(result.hours150.hours).toBe(8);
    });

    it("should maintain correct percentages", () => {
      const result = accumulator.handleSpecial(10);

      expect(result.hours100.percent).toBe(1);
      expect(result.hours125.percent).toBe(1.25);
      expect(result.hours150.percent).toBe(1.5);
    });

    it("should handle zero hours", () => {
      const result = accumulator.handleSpecial(0);

      expect(result.hours150.hours).toBe(0);
    });

    it("should handle decimal hours", () => {
      const result = accumulator.handleSpecial(7.5);

      expect(result.hours150.hours).toBe(7.5);
    });

    it("should handle large hour values", () => {
      const result = accumulator.handleSpecial(24);

      expect(result.hours150.hours).toBe(24);
    });

    it("should work with custom percentages", () => {
      const customAcc = new RegularByMonthAccumulator({
        percentages: { 
          hours100: 1,
          hours125: 1.25,
          hours150: 2.0,
        },
      });
      const result = customAcc.handleSpecial(8);

      expect(result.hours150.percent).toBe(2.0);
      expect(result.hours150.hours).toBe(8);
    });
  });

  describe("accumulate", () => {
    it("should accumulate hours100", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.hours).toBe(13);
    });

    it("should accumulate hours125", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 4 },
        hours150: { percent: 1.5, hours: 0 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours125.hours).toBe(7);
    });

    it("should accumulate hours150", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 6 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours150.hours).toBe(8);
    });

    it("should accumulate all tiers simultaneously", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.hours).toBe(13);
      expect(result.hours125.hours).toBe(5);
      expect(result.hours150.hours).toBe(3);
    });

    it("should maintain percentages from base", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.percent).toBe(1);
      expect(result.hours125.percent).toBe(1.25);
      expect(result.hours150.percent).toBe(1.5);
    });

    it("should handle accumulating empty breakdown", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const add = accumulator.createEmpty();

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.hours).toBe(8);
      expect(result.hours125.hours).toBe(2);
      expect(result.hours150.hours).toBe(1);
    });

    it("should handle accumulating to empty breakdown", () => {
      const base = accumulator.createEmpty();
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.hours).toBe(8);
      expect(result.hours125.hours).toBe(2);
      expect(result.hours150.hours).toBe(1);
    });

    it("should handle decimal hours", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 7.5 },
        hours125: { percent: 1.25, hours: 2.25 },
        hours150: { percent: 1.5, hours: 0.5 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 4.5 },
        hours125: { percent: 1.25, hours: 1.75 },
        hours150: { percent: 1.5, hours: 0.25 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.hours).toBeCloseTo(12.0, 1);
      expect(result.hours125.hours).toBeCloseTo(4.0, 1);
      expect(result.hours150.hours).toBeCloseTo(0.75, 2);
    });

    it("should not mutate the base object", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const baseCopy = JSON.parse(JSON.stringify(base));
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      accumulator.accumulate(base, add);

      expect(base).toEqual(baseCopy);
    });

    it("should be associative", () => {
      const a = accumulator.createEmpty();
      a.hours100.hours = 1;
      a.hours125.hours = 2;
      a.hours150.hours = 3;

      const b = accumulator.createEmpty();
      b.hours100.hours = 4;
      b.hours125.hours = 5;
      b.hours150.hours = 6;

      const c = accumulator.createEmpty();
      c.hours100.hours = 7;
      c.hours125.hours = 8;
      c.hours150.hours = 9;

      const result1 = accumulator.accumulate(accumulator.accumulate(a, b), c);
      const result2 = accumulator.accumulate(a, accumulator.accumulate(b, c));

      expect(result1).toEqual(result2);
    });

    it("should be commutative", () => {
      const a: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };
      const b: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result1 = accumulator.accumulate(a, b);
      const result2 = accumulator.accumulate(b, a);

      expect(result1).toEqual(result2);
    });
  });

  describe("subtract", () => {
    it("should subtract hours100", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 13 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours100.hours).toBe(8);
    });

    it("should subtract hours125", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 7 },
        hours150: { percent: 1.5, hours: 0 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours125.hours).toBe(4);
    });

    it("should subtract hours150", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 8 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 0 },
        hours125: { percent: 1.25, hours: 0 },
        hours150: { percent: 1.5, hours: 6 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours150.hours).toBe(2);
    });

    it("should subtract all tiers simultaneously", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 13 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 3 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours100.hours).toBe(8);
      expect(result.hours125.hours).toBe(2);
      expect(result.hours150.hours).toBe(1);
    });

    it("should not go below zero", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 10 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 3 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours100.hours).toBe(0);
      expect(result.hours125.hours).toBe(0);
      expect(result.hours150.hours).toBe(0);
    });

    it("should maintain percentages from base", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 13 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 3 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours100.percent).toBe(1);
      expect(result.hours125.percent).toBe(1.25);
      expect(result.hours150.percent).toBe(1.5);
    });

    it("should handle subtracting empty breakdown", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const sub = accumulator.createEmpty();

      const result = accumulator.subtract(base, sub);

      expect(result.hours100.hours).toBe(8);
      expect(result.hours125.hours).toBe(2);
      expect(result.hours150.hours).toBe(1);
    });

    it("should handle subtracting from empty breakdown", () => {
      const base = accumulator.createEmpty();
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result).toEqual(accumulator.createEmpty());
    });

    it("should handle decimal hours", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 12.0 },
        hours125: { percent: 1.25, hours: 4.0 },
        hours150: { percent: 1.5, hours: 0.75 },
      };
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 4.5 },
        hours125: { percent: 1.25, hours: 1.75 },
        hours150: { percent: 1.5, hours: 0.25 },
      };

      const result = accumulator.subtract(base, sub);

      expect(result.hours100.hours).toBeCloseTo(7.5, 1);
      expect(result.hours125.hours).toBeCloseTo(2.25, 2);
      expect(result.hours150.hours).toBeCloseTo(0.5, 2);
    });

    it("should not mutate the base object", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 13 },
        hours125: { percent: 1.25, hours: 5 },
        hours150: { percent: 1.5, hours: 3 },
      };
      const baseCopy = JSON.parse(JSON.stringify(base));
      const sub: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      accumulator.subtract(base, sub);

      expect(base).toEqual(baseCopy);
    });

    it("should be inverse of accumulate", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };
      const delta: RegularBreakdown = {
        hours100: { percent: 1, hours: 5 },
        hours125: { percent: 1.25, hours: 3 },
        hours150: { percent: 1.5, hours: 2 },
      };

      const accumulated = accumulator.accumulate(base, delta);
      const result = accumulator.subtract(accumulated, delta);

      expect(result).toEqual(base);
    });

    it("should handle exact subtraction to zero", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 1 },
      };

      const result = accumulator.subtract(base, base);

      expect(result).toEqual(accumulator.createEmpty());
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle monthly accumulation", () => {
      let monthTotal = accumulator.createEmpty();

      // Week 1 - 5 days of 8 hours each
      for (let i = 0; i < 5; i++) {
        monthTotal = accumulator.accumulate(monthTotal, {
          hours100: { percent: 1, hours: 8 },
          hours125: { percent: 1.25, hours: 0 },
          hours150: { percent: 1.5, hours: 0 },
        });
      }

      expect(monthTotal.hours100.hours).toBe(40);
    });

    it("should handle overtime accumulation", () => {
      let monthTotal = accumulator.createEmpty();

      // Regular day: 8h at 100%, 2h at 125%
      const overtimeDay: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      };

      for (let i = 0; i < 5; i++) {
        monthTotal = accumulator.accumulate(monthTotal, overtimeDay);
      }

      expect(monthTotal.hours100.hours).toBe(40);
      expect(monthTotal.hours125.hours).toBe(10);
    });

    it("should handle shift removal", () => {
      const monthTotal: RegularBreakdown = {
        hours100: { percent: 1, hours: 160 },
        hours125: { percent: 1.25, hours: 20 },
        hours150: { percent: 1.5, hours: 5 },
      };

      const removedShift: RegularBreakdown = {
        hours100: { percent: 1, hours: 8 },
        hours125: { percent: 1.25, hours: 2 },
        hours150: { percent: 1.5, hours: 0 },
      };

      const result = accumulator.subtract(monthTotal, removedShift);

      expect(result.hours100.hours).toBe(152);
      expect(result.hours125.hours).toBe(18);
      expect(result.hours150.hours).toBe(5);
    });

    it("should handle special day hours", () => {
      let monthTotal = accumulator.createEmpty();

      // Regular days
      for (let i = 0; i < 20; i++) {
        monthTotal = accumulator.accumulate(monthTotal, {
          hours100: { percent: 1, hours: 8 },
          hours125: { percent: 1.25, hours: 0 },
          hours150: { percent: 1.5, hours: 0 },
        });
      }

      // Add Shabbat shift (all at 150%)
      const shabbatShift = accumulator.handleSpecial(10);
      monthTotal = accumulator.accumulate(monthTotal, shabbatShift);

      expect(monthTotal.hours100.hours).toBe(160);
      expect(monthTotal.hours150.hours).toBe(10);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero hours in all tiers", () => {
      const base = accumulator.createEmpty();
      const add = accumulator.createEmpty();

      const result = accumulator.accumulate(base, add);

      expect(result).toEqual(accumulator.createEmpty());
    });

    it("should handle very large hour values", () => {
      const base: RegularBreakdown = {
        hours100: { percent: 1, hours: 1000 },
        hours125: { percent: 1.25, hours: 500 },
        hours150: { percent: 1.5, hours: 250 },
      };
      const add: RegularBreakdown = {
        hours100: { percent: 1, hours: 500 },
        hours125: { percent: 1.25, hours: 250 },
        hours150: { percent: 1.5, hours: 125 },
      };

      const result = accumulator.accumulate(base, add);

      expect(result.hours100.hours).toBe(1500);
      expect(result.hours125.hours).toBe(750);
      expect(result.hours150.hours).toBe(375);
    });

    it("should maintain precision with repeated operations", () => {
      let result = accumulator.createEmpty();

      for (let i = 0; i < 100; i++) {
        result = accumulator.accumulate(result, {
          hours100: { percent: 1, hours: 0.1 },
          hours125: { percent: 1.25, hours: 0.1 },
          hours150: { percent: 1.5, hours: 0.1 },
        });
      }

      expect(result.hours100.hours).toBeCloseTo(10, 1);
      expect(result.hours125.hours).toBeCloseTo(10, 1);
      expect(result.hours150.hours).toBeCloseTo(10, 1);
    });
  });

  describe("Custom Configuration", () => {
    it("should respect custom percentages in all methods", () => {
      const customConfig: Partial<RegularConfig> = {
        percentages: {
          hours100: 1.0,
          hours125: 1.3,
          hours150: 1.6,
        },
      };
      const customAcc = new RegularByMonthAccumulator(customConfig);

      const empty = customAcc.createEmpty();
      const special = customAcc.handleSpecial(8);

      expect(empty.hours100.percent).toBe(1.0);
      expect(empty.hours125.percent).toBe(1.3);
      expect(empty.hours150.percent).toBe(1.6);
      expect(special.hours150.percent).toBe(1.6);
    });

    it("should maintain custom percentages through accumulation", () => {
      const customAcc = new RegularByMonthAccumulator({
        percentages: { 
          hours100: 1,
          hours125: 1.3,
          hours150: 1.5,
        },
      });

      const base = customAcc.createEmpty();
      const add = customAcc.createEmpty();
      add.hours125.hours = 5;

      const result = customAcc.accumulate(base, add);

      expect(result.hours125.percent).toBe(1.3);
      expect(result.hours125.hours).toBe(5);
    });
  });
});
