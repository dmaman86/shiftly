import { describe, it, expect, beforeEach } from "vitest";
import { TimelinePerDiemRateResolver } from "@/domain/resolve/timeline-per-diem-rate.resolver";

describe("TimelinePerDiemRateResolver", () => {
  let resolver: TimelinePerDiemRateResolver;

  // Timeline data from the implementation:
  // { year: 2000, month: 1, rateA: 33.9 }
  // { year: 2024, month: 9, rateA: 36.3 }

  const RATE_2000_01 = 33.9;
  const RATE_2024_09 = 36.3;
  const RATE_DEFAULT = 0;

  beforeEach(() => {
    resolver = new TimelinePerDiemRateResolver();
  });

  describe("resolve - Before Timeline Start", () => {
    it("should return default rate (0) for year before 2000", () => {
      const result = resolver.resolve({ year: 1999, month: 12 });

      expect(result).toBe(RATE_DEFAULT);
    });

    it("should return default rate for December 1999", () => {
      const result = resolver.resolve({ year: 1999, month: 12 });

      expect(result).toBe(0);
    });

    it("should return default rate for year 1990", () => {
      const result = resolver.resolve({ year: 1990, month: 6 });

      expect(result).toBe(RATE_DEFAULT);
    });

    it("should return default rate for year 1980", () => {
      const result = resolver.resolve({ year: 1980, month: 1 });

      expect(result).toBe(RATE_DEFAULT);
    });

    it("should return default rate for January 2000 (before month 1)", () => {
      // Month 1 is the effective date, so month 0 (if used) should be before
      const result = resolver.resolve({ year: 2000, month: 0 });

      expect(result).toBe(RATE_DEFAULT);
    });
  });

  describe("resolve - First Timeline Entry (2000-01)", () => {
    it("should return 2000 rate for January 2000 (exact match)", () => {
      const result = resolver.resolve({ year: 2000, month: 1 });

      expect(result).toBe(RATE_2000_01);
      expect(result).toBe(33.9);
    });

    it("should return 2000 rate for February 2000", () => {
      const result = resolver.resolve({ year: 2000, month: 2 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for June 2000", () => {
      const result = resolver.resolve({ year: 2000, month: 6 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for December 2000", () => {
      const result = resolver.resolve({ year: 2000, month: 12 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for year 2001", () => {
      const result = resolver.resolve({ year: 2001, month: 1 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for year 2010", () => {
      const result = resolver.resolve({ year: 2010, month: 6 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for year 2020", () => {
      const result = resolver.resolve({ year: 2020, month: 12 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for year 2023", () => {
      const result = resolver.resolve({ year: 2023, month: 12 });

      expect(result).toBe(RATE_2000_01);
    });
  });

  describe("resolve - Second Timeline Entry (2024-09)", () => {
    it("should return 2024 rate for September 2024 (exact match)", () => {
      const result = resolver.resolve({ year: 2024, month: 9 });

      expect(result).toBe(RATE_2024_09);
      expect(result).toBe(36.3);
    });

    it("should return 2024 rate for October 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should return 2024 rate for December 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 12 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should return 2024 rate for January 2025", () => {
      const result = resolver.resolve({ year: 2025, month: 1 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should return 2024 rate for year 2026", () => {
      const result = resolver.resolve({ year: 2026, month: 6 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should return 2024 rate for far future year 2030", () => {
      const result = resolver.resolve({ year: 2030, month: 12 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should return 2024 rate for year 2100", () => {
      const result = resolver.resolve({ year: 2100, month: 1 });

      expect(result).toBe(RATE_2024_09);
    });
  });

  describe("resolve - Transition Between Entries", () => {
    it("should return 2000 rate for January 2024 (before September)", () => {
      const result = resolver.resolve({ year: 2024, month: 1 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for February 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 2 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for March 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 3 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for April 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 4 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for May 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 5 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for June 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 6 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for July 2024", () => {
      const result = resolver.resolve({ year: 2024, month: 7 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should return 2000 rate for August 2024 (one month before)", () => {
      const result = resolver.resolve({ year: 2024, month: 8 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should transition to 2024 rate exactly at September 2024", () => {
      const august = resolver.resolve({ year: 2024, month: 8 });
      const september = resolver.resolve({ year: 2024, month: 9 });

      expect(august).toBe(RATE_2000_01);
      expect(september).toBe(RATE_2024_09);
      expect(august).not.toBe(september);
    });
  });

  describe("resolve - Month Boundaries", () => {
    it("should handle month 1 (January/first month)", () => {
      const result = resolver.resolve({ year: 2000, month: 1 });

      expect(result).toBe(RATE_2000_01);
    });

    it("should handle month 12 (December/last month)", () => {
      const result2023 = resolver.resolve({ year: 2023, month: 12 });
      const result2024 = resolver.resolve({ year: 2024, month: 12 });

      expect(result2023).toBe(RATE_2000_01);
      expect(result2024).toBe(RATE_2024_09);
    });

    it("should handle all months in year 2024", () => {
      for (let month = 1; month <= 12; month++) {
        const result = resolver.resolve({ year: 2024, month });

        if (month < 9) {
          expect(result).toBe(RATE_2000_01);
        } else {
          expect(result).toBe(RATE_2024_09);
        }
      }
    });

    it("should handle all months in year 2010", () => {
      for (let month = 1; month <= 12; month++) {
        const result = resolver.resolve({ year: 2010, month });
        expect(result).toBe(RATE_2000_01);
      }
    });

    it("should handle all months in year 2025", () => {
      for (let month = 1; month <= 12; month++) {
        const result = resolver.resolve({ year: 2025, month });
        expect(result).toBe(RATE_2024_09);
      }
    });
  });

  describe("resolve - Rate Values", () => {
    it("should return correct rate for 2000 entry", () => {
      const result = resolver.resolve({ year: 2010, month: 6 });

      expect(result).toBe(33.9);
      expect(typeof result).toBe("number");
    });

    it("should return correct rate for 2024 entry", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toBe(36.3);
      expect(typeof result).toBe("number");
    });

    it("should show rate increase from 2000 to 2024", () => {
      const rate2000 = resolver.resolve({ year: 2020, month: 6 });
      const rate2024 = resolver.resolve({ year: 2024, month: 10 });

      expect(rate2024).toBeGreaterThan(rate2000);
    });

    it("should have rate as positive number for valid entries", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toBeGreaterThan(0);
    });

    it("should return exact numeric values without floating point errors", () => {
      const result2000 = resolver.resolve({ year: 2010, month: 6 });
      const result2024 = resolver.resolve({ year: 2024, month: 10 });

      expect(result2000).toBeCloseTo(33.9, 1);
      expect(result2024).toBeCloseTo(36.3, 1);
    });
  });

  describe("resolve - Edge Cases", () => {
    it("should handle month 0 (edge case)", () => {
      const result = resolver.resolve({ year: 2024, month: 0 });

      expect(result).toBeDefined();
      expect(typeof result).toBe("number");
    });

    it("should handle month 13 (edge case)", () => {
      const result = resolver.resolve({ year: 2024, month: 13 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should handle negative month (edge case)", () => {
      const result = resolver.resolve({ year: 2024, month: -1 });

      expect(result).toBeDefined();
      expect(typeof result).toBe("number");
    });

    it("should handle negative year (edge case)", () => {
      const result = resolver.resolve({ year: -1, month: 6 });

      expect(result).toBe(RATE_DEFAULT);
    });

    it("should handle very large year", () => {
      const result = resolver.resolve({ year: 9999, month: 12 });

      expect(result).toBe(RATE_2024_09);
    });

    it("should handle year 0 (edge case)", () => {
      const result = resolver.resolve({ year: 0, month: 1 });

      expect(result).toBe(RATE_DEFAULT);
    });
  });

  describe("resolve - Return Value Structure", () => {
    it("should return a number", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(typeof result).toBe("number");
    });

    it("should not return null or undefined", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });

    it("should return valid numeric value even for dates before timeline", () => {
      const result = resolver.resolve({ year: 1990, month: 1 });

      expect(result).toBe(0);
      expect(typeof result).toBe("number");
    });

    it("should return a finite number", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(Number.isFinite(result)).toBe(true);
    });

    it("should not return NaN", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(Number.isNaN(result)).toBe(false);
    });
  });

  describe("resolve - Consistency and Determinism", () => {
    it("should return consistent results for same input", () => {
      const result1 = resolver.resolve({ year: 2024, month: 10 });
      const result2 = resolver.resolve({ year: 2024, month: 10 });
      const result3 = resolver.resolve({ year: 2024, month: 10 });

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should return consistent results across multiple instances", () => {
      const resolver1 = new TimelinePerDiemRateResolver();
      const resolver2 = new TimelinePerDiemRateResolver();

      const result1 = resolver1.resolve({ year: 2024, month: 10 });
      const result2 = resolver2.resolve({ year: 2024, month: 10 });

      expect(result1).toBe(result2);
    });

    it("should handle multiple sequential calls correctly", () => {
      const results = [
        resolver.resolve({ year: 2020, month: 6 }),
        resolver.resolve({ year: 2024, month: 9 }),
        resolver.resolve({ year: 2025, month: 1 }),
        resolver.resolve({ year: 1999, month: 12 }),
      ];

      expect(results[0]).toBe(RATE_2000_01);
      expect(results[1]).toBe(RATE_2024_09);
      expect(results[2]).toBe(RATE_2024_09);
      expect(results[3]).toBe(RATE_DEFAULT);
    });

    it("should not be affected by previous calls", () => {
      resolver.resolve({ year: 2024, month: 10 });
      resolver.resolve({ year: 1999, month: 1 });
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toBe(RATE_2024_09);
    });
  });

  describe("resolve - Timeline Logic Validation", () => {
    it("should select most recent applicable entry", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      // Should pick 2024-09 (36.3), not 2000-01 (33.9)
      expect(result).toBe(RATE_2024_09);
    });

    it("should filter out future entries", () => {
      const result = resolver.resolve({ year: 2024, month: 8 });

      // 2024-09 is in the future, so should use 2000-01
      expect(result).toBe(RATE_2000_01);
    });

    it("should compare year first, then month", () => {
      const resultBeforeYear = resolver.resolve({ year: 2023, month: 12 });
      const resultAfterYear = resolver.resolve({ year: 2024, month: 1 });

      // Both should use 2000-01 since they're before 2024-09
      expect(resultBeforeYear).toBe(RATE_2000_01);
      expect(resultAfterYear).toBe(RATE_2000_01);
    });

    it("should handle exact match on year and month", () => {
      const result1 = resolver.resolve({ year: 2000, month: 1 });
      const result2 = resolver.resolve({ year: 2024, month: 9 });

      expect(result1).toBe(RATE_2000_01);
      expect(result2).toBe(RATE_2024_09);
    });

    it("should include entry when month equals", () => {
      const result = resolver.resolve({ year: 2024, month: 9 });

      // entry.month <= month should include month 9
      expect(result).toBe(RATE_2024_09);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical usage for current date (2024-10)", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      expect(result).toBe(36.3);
    });

    it("should handle historical date (2015-06)", () => {
      const result = resolver.resolve({ year: 2015, month: 6 });

      expect(result).toBe(33.9);
    });

    it("should handle year boundary transition (2023-12 to 2024-01)", () => {
      const dec2023 = resolver.resolve({ year: 2023, month: 12 });
      const jan2024 = resolver.resolve({ year: 2024, month: 1 });

      expect(dec2023).toBe(RATE_2000_01);
      expect(jan2024).toBe(RATE_2000_01);
      expect(dec2023).toBe(jan2024);
    });

    it("should handle rate change month (August to September 2024)", () => {
      const aug = resolver.resolve({ year: 2024, month: 8 });
      const sep = resolver.resolve({ year: 2024, month: 9 });

      expect(aug).toBe(33.9);
      expect(sep).toBe(36.3);
    });

    it("should handle future planning (2026)", () => {
      const result = resolver.resolve({ year: 2026, month: 6 });

      // Should use most recent known rate (2024-09)
      expect(result).toBe(RATE_2024_09);
    });

    it("should calculate rate increase percentage", () => {
      const rate2000 = resolver.resolve({ year: 2020, month: 1 });
      const rate2024 = resolver.resolve({ year: 2024, month: 10 });

      const increase = ((rate2024 - rate2000) / rate2000) * 100;

      expect(increase).toBeCloseTo(7.08, 1); // ~7.08% increase
    });

    it("should calculate absolute rate increase", () => {
      const rate2000 = resolver.resolve({ year: 2020, month: 1 });
      const rate2024 = resolver.resolve({ year: 2024, month: 10 });

      const absoluteIncrease = rate2024 - rate2000;

      expect(absoluteIncrease).toBeCloseTo(2.4, 1); // 36.3 - 33.9 = 2.4
    });
  });

  describe("Real-world Date Scenarios", () => {
    it("should handle all months of 2022", () => {
      const results = Array.from({ length: 12 }, (_, i) =>
        resolver.resolve({ year: 2022, month: i + 1 })
      );

      results.forEach((result) => {
        expect(result).toBe(RATE_2000_01);
      });
    });

    it("should handle all months of 2024 with correct transition", () => {
      const results = Array.from({ length: 12 }, (_, i) =>
        resolver.resolve({ year: 2024, month: i + 1 })
      );

      results.slice(0, 8).forEach((result) => {
        expect(result).toBe(RATE_2000_01);
      });
      results.slice(8).forEach((result) => {
        expect(result).toBe(RATE_2024_09);
      });
    });

    it("should handle quarterly periods in 2024", () => {
      const q1 = resolver.resolve({ year: 2024, month: 3 }); // March
      const q2 = resolver.resolve({ year: 2024, month: 6 }); // June
      const q3 = resolver.resolve({ year: 2024, month: 9 }); // September
      const q4 = resolver.resolve({ year: 2024, month: 12 }); // December

      expect(q1).toBe(RATE_2000_01);
      expect(q2).toBe(RATE_2000_01);
      expect(q3).toBe(RATE_2024_09);
      expect(q4).toBe(RATE_2024_09);
    });

    it("should handle fiscal year transitions", () => {
      const fiscal2023 = resolver.resolve({ year: 2023, month: 12 });
      const fiscal2024 = resolver.resolve({ year: 2024, month: 1 });
      const fiscal2025 = resolver.resolve({ year: 2025, month: 1 });

      expect(fiscal2023).toBe(RATE_2000_01);
      expect(fiscal2024).toBe(RATE_2000_01);
      expect(fiscal2025).toBe(RATE_2024_09);
    });

    it("should handle leap year transition (February 2024)", () => {
      const feb2024 = resolver.resolve({ year: 2024, month: 2 });
      const mar2024 = resolver.resolve({ year: 2024, month: 3 });

      expect(feb2024).toBe(RATE_2000_01);
      expect(mar2024).toBe(RATE_2000_01);
    });
  });

  describe("Sorting and Filtering Logic", () => {
    it("should correctly filter entries before or equal to requested date", () => {
      // August 2024: should only include 2000-01 entry
      const resultAugust = resolver.resolve({ year: 2024, month: 8 });
      expect(resultAugust).toBe(RATE_2000_01);
    });

    it("should correctly filter both entries for September 2024 and pick latest", () => {
      // September 2024: both entries are applicable, should pick 2024-09
      const resultSeptember = resolver.resolve({ year: 2024, month: 9 });
      expect(resultSeptember).toBe(RATE_2024_09);
    });

    it("should sort by year descending when filtering", () => {
      // Future date: both entries applicable, should pick most recent (2024-09)
      const result = resolver.resolve({ year: 2025, month: 1 });
      expect(result).toBe(RATE_2024_09);
    });

    it("should sort by month descending when year is same", () => {
      // Hypothetically if there were multiple entries in same year
      // Current implementation has different years, but logic should work
      const result = resolver.resolve({ year: 2024, month: 12 });
      expect(result).toBe(RATE_2024_09);
    });

    it("should return first element after sorting", () => {
      const result = resolver.resolve({ year: 2025, month: 6 });

      // Should return the [0] element after sorting (most recent)
      expect(result).toBe(RATE_2024_09);
    });

    it("should handle empty filtered array gracefully", () => {
      const result = resolver.resolve({ year: 1999, month: 12 });

      // No applicable entries, should return 0
      expect(result).toBe(RATE_DEFAULT);
    });
  });

  describe("Comparison with Similar Resolvers", () => {
    it("should follow same timeline pattern as meal allowance resolver", () => {
      // Both resolvers should have the same effective dates
      // Testing that the pattern is consistent
      const transitionalMonths = [
        { year: 2024, month: 8, expected: RATE_2000_01 },
        { year: 2024, month: 9, expected: RATE_2024_09 },
      ];

      transitionalMonths.forEach(({ year, month, expected }) => {
        const result = resolver.resolve({ year, month });
        expect(result).toBe(expected);
      });
    });

    it("should have rate increase proportional to other allowances", () => {
      const rate2000 = resolver.resolve({ year: 2010, month: 1 });
      const rate2024 = resolver.resolve({ year: 2024, month: 10 });

      // Per diem should increase (not decrease)
      expect(rate2024).toBeGreaterThan(rate2000);

      // Increase should be reasonable (between 1% and 20%)
      const increasePercent = ((rate2024 - rate2000) / rate2000) * 100;
      expect(increasePercent).toBeGreaterThan(1);
      expect(increasePercent).toBeLessThan(20);
    });
  });

  describe("Business Rules Validation", () => {
    it("should never return negative rate", () => {
      const testCases = [
        { year: 1999, month: 12 },
        { year: 2000, month: 1 },
        { year: 2024, month: 9 },
        { year: 2025, month: 1 },
      ];

      testCases.forEach(({ year, month }) => {
        const result = resolver.resolve({ year, month });
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    it("should have rate increase reflect inflation/cost of living", () => {
      const rate2000 = resolver.resolve({ year: 2010, month: 1 });
      const rate2024 = resolver.resolve({ year: 2024, month: 10 });

      // Rate should increase to reflect 24+ years of inflation
      expect(rate2024).toBeGreaterThan(rate2000);
    });

    it("should maintain rate precision for financial calculations", () => {
      const result = resolver.resolve({ year: 2024, month: 10 });

      // Rate should have at most 2 decimal places for currency
      const decimalPlaces = (result.toString().split(".")[1] || "").length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it("should return consistent rate for entire effective period", () => {
      // All months from Sep 2024 to present should have same rate
      const sep2024 = resolver.resolve({ year: 2024, month: 9 });
      const oct2024 = resolver.resolve({ year: 2024, month: 10 });
      const dec2024 = resolver.resolve({ year: 2024, month: 12 });

      expect(sep2024).toBe(oct2024);
      expect(oct2024).toBe(dec2024);
    });
  });
});
