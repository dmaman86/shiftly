import { describe, it, expect, beforeEach } from "vitest";
import { TimelineMealAllowanceRateResolver } from "@/domain/resolve/timeline-meal-allowance-rate.resolver";
import type { MealAllowanceRates } from "@/domain/types/types";

describe("TimelineMealAllowanceRateResolver", () => {
  let resolver: TimelineMealAllowanceRateResolver;

  // Timeline data from the implementation:
  // { year: 2000, month: 1, rates: { small: 13.5, large: 19.7 } }
  // { year: 2024, month: 9, rates: { small: 14.5, large: 21.1 } }

  const RATES_2000_01: MealAllowanceRates = { small: 13.5, large: 19.7 };
  const RATES_2024_09: MealAllowanceRates = { small: 14.5, large: 21.1 };
  const RATES_DEFAULT: MealAllowanceRates = { small: 0, large: 0 };

  beforeEach(() => {
    resolver = new TimelineMealAllowanceRateResolver();
  });

  describe("resolve - Before Timeline Start", () => {
    it("should return default rates (0, 0) for year before 2000", () => {
      const result = resolver.resolve({ year: 1999, month: 12 });

      expect(result).toEqual(RATES_DEFAULT);
    });

    it("should return default rates for December 1999", () => {
      const result = resolver.resolve({ year: 1999, month: 12 });

      expect(result).toEqual({ small: 0, large: 0 });
    });

    it("should return default rates for year 1990", () => {
      const result = resolver.resolve({ year: 1990, month: 6 });

      expect(result).toEqual(RATES_DEFAULT);
    });

    it("should return default rates for year 1980", () => {
      const result = resolver.resolve({ year: 1980, month: 1 });

      expect(result).toEqual(RATES_DEFAULT);
    });

    it("should return default rates for January 2000 (before month 1)", () => {
      // Month 1 is the effective date, so month 0 (January in some contexts) should be before
      // Note: Need to verify if month is 0-based or 1-based
      const result = resolver.resolve({ year: 2000, month: 0 });

      expect(result).toEqual(RATES_DEFAULT);
    });
  });

  describe("resolve - First Timeline Entry (2000-01)", () => {
    it("should return 2000 rates for January 2000 (exact match)", () => {
      const result = resolver.resolve({ year: 2000, month: 1 });

      expect(result).toEqual(RATES_2000_01);
      expect(result.small).toBe(13.5);
      expect(result.large).toBe(19.7);
    });

    it("should return 2000 rates for February 2000", () => {
      const result = resolver.resolve({ year: 2000, month: 2 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for June 2000", () => {
      const result = resolver.resolve({ year: 2000, month: 6 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for December 2000", () => {
      const result = resolver.resolve({ year: 2000, month: 12 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for year 2001", () => {
      const result = resolver.resolve({ year: 2001, month: 1 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for year 2010", () => {
      const result = resolver.resolve({ year: 2010, month: 6 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for year 2020", () => {
      const result = resolver.resolve({ year: 2020, month: 12 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for year 2023", () => {
      const result = resolver.resolve({ year: 2023, month: 12 });

      expect(result).toEqual(RATES_2000_01);
    });
  });

  describe("resolve - Second Timeline Entry (2024-09)", () => {
    it("should return 2024 rates for September 2024 (exact match)", () => {
      const result = resolver.resolve({ year: 2024, month: 9 });

      expect(result).toEqual(RATES_2024_09);
      expect(result.small).toBe(14.5);
      expect(result.large).toBe(21.1);
    });

    it("should return 2024 rates for October 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should return 2024 rates for December 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 12 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should return 2024 rates for January 2025", () => {
      const result = resolver.resolve({ year: 2025, month: 1 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should return 2024 rates for year 2026", () => {
      const result = resolver.resolve({ year: 2026, month: 6 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should return 2024 rates for far future year 2030", () => {
      const result = resolver.resolve({ year: 2030, month: 12 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should return 2024 rates for year 2100", () => {
      const result = resolver.resolve({ year: 2100, month: 1 });

      expect(result).toEqual(RATES_2024_09);
    });
  });

  describe("resolve - Transition Between Entries", () => {
    it("should return 2000 rates for January 2024 (before September)", () => {
      const result = resolver.resolve({ year: 2024, month: 1 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for February 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 2 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for March 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 3 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for April 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 4 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for May 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 5 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for June 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 6 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for July 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 7 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should return 2000 rates for August 2024 (one month before)", () => {
      const result = resolver.resolve({ year: 2024, month: 8 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should transition to 2024 rates exactly at September 2024", () => {
      const august = resolver.resolve({ year: 2024, month: 8 });
      const september = resolver.resolve({ year: 2024, month: 9 });

      expect(august).toEqual(RATES_2000_01);
      expect(september).toEqual(RATES_2024_09);
      expect(august).not.toEqual(september);
    });
  });

  describe("resolve - Month Boundaries", () => {
    it("should handle month 1 (January/first month)", () => {
      const result = resolver.resolve({ year: 2000, month: 1 });

      expect(result).toEqual(RATES_2000_01);
    });

    it("should handle month 12 (December/last month)", () => {
      const result2023 = resolver.resolve({ year: 2023, month: 12 });
      const result2024 = resolver.resolve({ year: 2024, month: 12 });

      expect(result2023).toEqual(RATES_2000_01);
      expect(result2024).toEqual(RATES_2024_09);
    });

    it("should handle all months in year 2024", () => {
      for (let month = 1; month <= 12; month++) {
        const result = resolver.resolve({ year: 2024, month });

        if (month < 9) {
          expect(result).toEqual(RATES_2000_01);
        } else {
          expect(result).toEqual(RATES_2024_09);
        }
      }
    });

    it("should handle all months in year 2010", () => {
      for (let month = 1; month <= 12; month++) {
        const result = resolver.resolve({ year: 2010, month });
        expect(result).toEqual(RATES_2000_01);
      }
    });

    it("should handle all months in year 2025", () => {
      for (let month = 1; month <= 12; month++) {
        const result = resolver.resolve({ year: 2025, month });
        expect(result).toEqual(RATES_2024_09);
      }
    });
  });

  describe("resolve - Rate Values", () => {
    it("should return correct small rate for 2000 entry", () => {
      const result = resolver.resolve({ year: 2010, month: 6 });

      expect(result.small).toBe(13.5);
      expect(typeof result.small).toBe("number");
    });

    it("should return correct large rate for 2000 entry", () => {
      const result = resolver.resolve({ year: 2010, month: 6 });

      expect(result.large).toBe(19.7);
      expect(typeof result.large).toBe("number");
    });

    it("should return correct small rate for 2024 entry", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result.small).toBe(14.5);
      expect(typeof result.small).toBe("number");
    });

    it("should return correct large rate for 2024 entry", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result.large).toBe(21.1);
      expect(typeof result.large).toBe("number");
    });

    it("should show rate increase from 2000 to 2024", () => {
      const rates2000 = resolver.resolve({ year: 2020, month: 6 });
      const rates2024 = resolver.resolve({ year: 2024, month: 10 });

      expect(rates2024.small).toBeGreaterThan(rates2000.small);
      expect(rates2024.large).toBeGreaterThan(rates2000.large);
    });

    it("should have both rates as positive numbers for valid entries", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result.small).toBeGreaterThan(0);
      expect(result.large).toBeGreaterThan(0);
    });

    it("should have large rate greater than small rate", () => {
      const rates2000 = resolver.resolve({ year: 2010, month: 6 });
      const rates2024 = resolver.resolve({ year: 2024, month: 10 });

      expect(rates2000.large).toBeGreaterThan(rates2000.small);
      expect(rates2024.large).toBeGreaterThan(rates2024.small);
    });
  });

  describe("resolve - Edge Cases", () => {
    it("should handle month 0 (edge case)", () => {
      const result = resolver.resolve({ year: 2024, month: 0 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("small");
      expect(result).toHaveProperty("large");
    });

    it("should handle month 13 (edge case)", () => {
      const result = resolver.resolve({ year: 2024, month: 13 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should handle negative month (edge case)", () => {
      const result = resolver.resolve({ year: 2024, month: -1 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("small");
      expect(result).toHaveProperty("large");
    });

    it("should handle negative year (edge case)", () => {
      const result = resolver.resolve({ year: -1, month: 6 });

      expect(result).toEqual(RATES_DEFAULT);
    });

    it("should handle very large year", () => {
      const result = resolver.resolve({ year: 9999, month: 12 });

      expect(result).toEqual(RATES_2024_09);
    });

    it("should handle year 0 (edge case)", () => {
      const result = resolver.resolve({ year: 0, month: 1 });

      expect(result).toEqual(RATES_DEFAULT);
    });
  });

  describe("resolve - Return Value Structure", () => {
    it("should return object with small and large properties", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toHaveProperty("small");
      expect(result).toHaveProperty("large");
      expect(Object.keys(result)).toHaveLength(2);
    });

    it("should return numbers for both rate values", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(typeof result.small).toBe("number");
      expect(typeof result.large).toBe("number");
    });

    it("should not return null or undefined", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });

    it("should return valid MealAllowanceRates structure even for dates before timeline", () => {
      const result = resolver.resolve({ year: 1990, month: 1 });

      expect(result).toEqual({ small: 0, large: 0 });
      expect(result).toHaveProperty("small");
      expect(result).toHaveProperty("large");
    });
  });

  describe("resolve - Consistency and Determinism", () => {
    it("should return consistent results for same input", () => {
      const result1 = resolver.resolve({ year: 2024, month: 10 });
      const result2 = resolver.resolve({ year: 2024, month: 10 });
      const result3 = resolver.resolve({ year: 2024, month: 10 });

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should return consistent results across multiple instances", () => {
      const resolver1 = new TimelineMealAllowanceRateResolver();
      const resolver2 = new TimelineMealAllowanceRateResolver();

      const result1 = resolver1.resolve({ year: 2024, month: 10 });
      const result2 = resolver2.resolve({ year: 2024, month: 10 });

      expect(result1).toEqual(result2);
    });

    it("should handle multiple sequential calls correctly", () => {
      const results = [
        resolver.resolve({ year: 2020, month: 6 }),
        resolver.resolve({ year: 2024, month: 9 }),
        resolver.resolve({ year: 2025, month: 1 }),
        resolver.resolve({ year: 1999, month: 12 }),
      ];

      expect(results[0]).toEqual(RATES_2000_01);
      expect(results[1]).toEqual(RATES_2024_09);
      expect(results[2]).toEqual(RATES_2024_09);
      expect(results[3]).toEqual(RATES_DEFAULT);
    });

    it("should not be affected by previous calls", () => {
      resolver.resolve({ year: 2024, month: 10 });
      resolver.resolve({ year: 1999, month: 1 });
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toEqual(RATES_2024_09);
    });
  });

  describe("resolve - Timeline Logic Validation", () => {
    it("should select most recent applicable entry", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      // Should pick 2024-09, not 2000-01
      expect(result).toEqual(RATES_2024_09);
    });

    it("should filter out future entries", () => {
      const result = resolver.resolve({ year: 2024, month: 8 });

      // 2024-09 is in the future, so should use 2000-01
      expect(result).toEqual(RATES_2000_01);
    });

    it("should compare year first, then month", () => {
      const resultBeforeYear = resolver.resolve({ year: 2023, month: 12 });
      const resultAfterYear = resolver.resolve({ year: 2024, month: 1 });

      // Both should use 2000-01 since they're before 2024-09
      expect(resultBeforeYear).toEqual(RATES_2000_01);
      expect(resultAfterYear).toEqual(RATES_2000_01);
    });

    it("should handle exact match on year and month", () => {
      const result1 = resolver.resolve({ year: 2000, month: 1 });
      const result2 = resolver.resolve({ year: 2024, month: 9 });

      expect(result1).toEqual(RATES_2000_01);
      expect(result2).toEqual(RATES_2024_09);
    });

    it("should include entry when month equals", () => {
      const result = resolver.resolve({ year: 2024, month: 9 });

      // entry.month <= month should include month 9
      expect(result).toEqual(RATES_2024_09);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical usage for current date (2024-10)", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result.small).toBe(14.5);
      expect(result.large).toBe(21.1);
    });

    it("should handle historical date (2015-06)", () => {
      const result = resolver.resolve({ year: 2015, month: 6 });

      expect(result.small).toBe(13.5);
      expect(result.large).toBe(19.7);
    });

    it("should handle year boundary transition (2023-12 to 2024-01)", () => {
      const dec2023 = resolver.resolve({ year: 2023, month: 12 });
      const jan2024 = resolver.resolve({ year: 2024, month: 1 });

      expect(dec2023).toEqual(RATES_2000_01);
      expect(jan2024).toEqual(RATES_2000_01);
      expect(dec2023).toEqual(jan2024);
    });

    it("should handle rate change month (August to September 2024)", () => {
      const aug = resolver.resolve({ year: 2024, month: 8 });
      const sep = resolver.resolve({ year: 2024, month: 9 });

      expect(aug.small).toBe(13.5);
      expect(sep.small).toBe(14.5);
      expect(aug.large).toBe(19.7);
      expect(sep.large).toBe(21.1);
    });

    it("should handle future planning (2026)", () => {
      const result = resolver.resolve({ year: 2026, month: 6 });

      // Should use most recent known rate (2024-09)
      expect(result).toEqual(RATES_2024_09);
    });

    it("should calculate rate increase percentage", () => {
      const rates2000 = resolver.resolve({ year: 2020, month: 1 });
      const rates2024 = resolver.resolve({ year: 2024, month: 10 });

      const smallIncrease = ((rates2024.small - rates2000.small) / rates2000.small) * 100;
      const largeIncrease = ((rates2024.large - rates2000.large) / rates2000.large) * 100;

      expect(smallIncrease).toBeCloseTo(7.4, 1); // ~7.4% increase
      expect(largeIncrease).toBeCloseTo(7.1, 1); // ~7.1% increase
    });
  });

  describe("Real-world Date Scenarios", () => {
    it("should handle all months of 2022", () => {
      const results = Array.from({ length: 12 }, (_, i) =>
        resolver.resolve({ year: 2022, month: i + 1 })
      );

      results.forEach((result) => {
        expect(result).toEqual(RATES_2000_01);
      });
    });

    it("should handle all months of 2024 with correct transition", () => {
      const results = Array.from({ length: 12 }, (_, i) =>
        resolver.resolve({ year: 2024, month: i + 1 })
      );

      results.slice(0, 8).forEach((result) => {
        expect(result).toEqual(RATES_2000_01);
      });
      results.slice(8).forEach((result) => {
        expect(result).toEqual(RATES_2024_09);
      });
    });

    it("should handle quarterly periods in 2024", () => {
      const q1 = resolver.resolve({ year: 2024, month: 3 }); // March
      const q2 = resolver.resolve({ year: 2024, month: 6 }); // June
      const q3 = resolver.resolve({ year: 2024, month: 9 }); // September
      const q4 = resolver.resolve({ year: 2024, month: 12 }); // December

      expect(q1).toEqual(RATES_2000_01);
      expect(q2).toEqual(RATES_2000_01);
      expect(q3).toEqual(RATES_2024_09);
      expect(q4).toEqual(RATES_2024_09);
    });

    it("should handle fiscal year transitions", () => {
      const fiscal2023 = resolver.resolve({ year: 2023, month: 12 });
      const fiscal2024 = resolver.resolve({ year: 2024, month: 1 });
      const fiscal2025 = resolver.resolve({ year: 2025, month: 1 });

      expect(fiscal2023).toEqual(RATES_2000_01);
      expect(fiscal2024).toEqual(RATES_2000_01);
      expect(fiscal2025).toEqual(RATES_2024_09);
    });
  });
});
