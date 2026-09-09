import { describe, it, expect } from "vitest";
import { DefaultMonthResolver } from "@/domain/resolve/month.resolver";

describe("DefaultMonthResolver", () => {
  const SYSTEM_START_YEAR = 2015;

  describe("constructor and dateProvider", () => {
    it("should use default date provider when none provided", () => {
      const resolver = new DefaultMonthResolver();

      const currentYear = resolver.getCurrentYear();

      expect(currentYear).toBeGreaterThanOrEqual(2024);
    });

    it("should use custom date provider when provided", () => {
      const fixedDate = new Date("2023-06-15T12:00:00.000Z");
      const resolver = new DefaultMonthResolver(() => fixedDate);

      const currentYear = resolver.getCurrentYear();

      expect(currentYear).toBe(2023);
    });

    it("should consistently use provided date provider", () => {
      const fixedDate = new Date("2022-03-10T10:00:00.000Z");
      const resolver = new DefaultMonthResolver(() => fixedDate);

      const year1 = resolver.getCurrentYear();
      const year2 = resolver.getCurrentYear();
      const months = resolver.getAvailableMonths(2022);

      expect(year1).toBe(2022);
      expect(year2).toBe(2022);
      expect(months).toHaveLength(3); // Jan, Feb, Mar (0-2)
    });
  });

  describe("getAvailableMonths", () => {
    describe("before system start year", () => {
      it("should return empty array for year 2014", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2014);

        expect(result).toEqual([]);
      });

      it("should return empty array for year 2010", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2010);

        expect(result).toEqual([]);
      });

      it("should return empty array for year 2000", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2000);

        expect(result).toEqual([]);
      });

      it("should return empty array for year 1990", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(1990);

        expect(result).toEqual([]);
      });
    });

    describe("system start year (2015)", () => {
      it("should return months from November to December (10, 11)", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(SYSTEM_START_YEAR);

        expect(result).toEqual([10, 11]);
      });

      it("should handle system start year correctly regardless of current date", () => {
        const resolver1 = new DefaultMonthResolver(() => new Date("2020-01-01"));
        const resolver2 = new DefaultMonthResolver(() => new Date("2025-12-31"));

        expect(resolver1.getAvailableMonths(2015)).toEqual([10, 11]);
        expect(resolver2.getAvailableMonths(2015)).toEqual([10, 11]);
      });
    });

    describe("past years (before current year)", () => {
      it("should return all 12 months for year 2020 when current is 2023", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2020);

        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(result).toHaveLength(12);
      });

      it("should return all 12 months for year 2016", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2016);

        expect(result).toHaveLength(12);
      });

      it("should return all 12 months for year 2022", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2022);

        expect(result).toHaveLength(12);
      });

      it("should return all 12 months for multiple past years", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        expect(resolver.getAvailableMonths(2016)).toHaveLength(12);
        expect(resolver.getAvailableMonths(2017)).toHaveLength(12);
        expect(resolver.getAvailableMonths(2018)).toHaveLength(12);
        expect(resolver.getAvailableMonths(2019)).toHaveLength(12);
        expect(resolver.getAvailableMonths(2020)).toHaveLength(12);
        expect(resolver.getAvailableMonths(2021)).toHaveLength(12);
        expect(resolver.getAvailableMonths(2022)).toHaveLength(12);
      });
    });

    describe("current year", () => {
      it("should return months from January to current month (June = 0-5)", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date("2023-06-15T12:00:00.000Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4, 5]);
        expect(result).toHaveLength(6);
      });

      it("should include current month for January (month 0)", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date("2023-01-15T12:00:00.000Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0]);
        expect(result).toHaveLength(1);
      });

      it("should include all months for December (month 11)", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date("2023-12-15T12:00:00.000Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(result).toHaveLength(12);
      });

      it("should return months 0-2 for March", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date("2023-03-10T12:00:00.000Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2]);
      });

      it("should return months 0-8 for September", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date("2023-09-20T12:00:00.000Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      });

      it("should handle first day of month correctly", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date(2023, 4, 1, 0, 0, 0, 0) // May 1, 2023 in local time
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4]);
      });

      it("should handle last day of month correctly", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date(2023, 6, 31, 23, 59, 59, 999) // July 31, 2023 in local time
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
      });
    });

    describe("future years", () => {
      it("should return empty array for year 2024 when current is 2023", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2024);

        expect(result).toEqual([]);
      });

      it("should return empty array for year 2025", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2025);

        expect(result).toEqual([]);
      });

      it("should return empty array for year 2030", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2030);

        expect(result).toEqual([]);
      });

      it("should return empty array for far future year 2100", () => {
        const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

        const result = resolver.getAvailableMonths(2100);

        expect(result).toEqual([]);
      });
    });
  });

  describe("resolveDefaultMonth", () => {
    it("should return November (11) for system start year 2015", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.resolveDefaultMonth(SYSTEM_START_YEAR);

      expect(result).toBe(11); // SYSTEM_START_MONTH + 1 = 10 + 1 = 11
    });

    it("should return current month + 1 for current year (June = 6)", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-06-15T12:00:00.000Z")
      );

      const result = resolver.resolveDefaultMonth(2023);

      expect(result).toBe(6); // currentMonth (5) + 1 = 6
    });

    it("should return January (1) for past years", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      expect(resolver.resolveDefaultMonth(2020)).toBe(1);
      expect(resolver.resolveDefaultMonth(2021)).toBe(1);
      expect(resolver.resolveDefaultMonth(2022)).toBe(1);
    });

    it("should return 1 (January) for year 2016", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.resolveDefaultMonth(2016);

      expect(result).toBe(1);
    });

    it("should handle January as current month (return 1)", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-01-15T12:00:00.000Z")
      );

      const result = resolver.resolveDefaultMonth(2023);

      expect(result).toBe(1); // currentMonth (0) + 1 = 1
    });

    it("should handle December as current month (return 12)", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-12-15T12:00:00.000Z")
      );

      const result = resolver.resolveDefaultMonth(2023);

      expect(result).toBe(12); // currentMonth (11) + 1 = 12
    });

    it("should return consistent default for past years", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result1 = resolver.resolveDefaultMonth(2019);
      const result2 = resolver.resolveDefaultMonth(2020);
      const result3 = resolver.resolveDefaultMonth(2021);

      expect(result1).toBe(1);
      expect(result2).toBe(1);
      expect(result3).toBe(1);
    });

    it("should return 1 for future years (edge case)", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.resolveDefaultMonth(2024);

      expect(result).toBe(1);
    });
  });

  describe("getCurrentYear", () => {
    it("should return current year from date provider", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-06-15T12:00:00.000Z")
      );

      const result = resolver.getCurrentYear();

      expect(result).toBe(2023);
    });

    it("should return consistent year from date provider", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2022-03-10T10:00:00.000Z")
      );

      const result1 = resolver.getCurrentYear();
      const result2 = resolver.getCurrentYear();
      const result3 = resolver.getCurrentYear();

      expect(result1).toBe(2022);
      expect(result2).toBe(2022);
      expect(result3).toBe(2022);
    });

    it("should handle different years correctly", () => {
      const resolver2020 = new DefaultMonthResolver(() => new Date("2020-01-01"));
      const resolver2021 = new DefaultMonthResolver(() => new Date("2021-12-31"));
      const resolver2024 = new DefaultMonthResolver(() => new Date("2024-07-15"));

      expect(resolver2020.getCurrentYear()).toBe(2020);
      expect(resolver2021.getCurrentYear()).toBe(2021);
      expect(resolver2024.getCurrentYear()).toBe(2024);
    });

    it("should work with default date provider", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getCurrentYear();

      expect(result).toBeGreaterThanOrEqual(2024);
      expect(typeof result).toBe("number");
    });

    it("should handle year transitions correctly", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-12-15T12:00:00.000Z")
      );

      const result = resolver.getCurrentYear();

      expect(result).toBe(2023);
    });
  });

  describe("Edge Cases and Boundaries", () => {
    it("should handle leap year (2024) correctly", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2024-02-29T12:00:00.000Z")
      );

      const months = resolver.getAvailableMonths(2024);
      const currentYear = resolver.getCurrentYear();

      expect(currentYear).toBe(2024);
      expect(months).toEqual([0, 1]);
    });

    it("should handle year 2015 month boundaries correctly", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const months = resolver.getAvailableMonths(2015);

      expect(months).toEqual([10, 11]);
      expect(months).not.toContain(9);
      expect(months).toHaveLength(2);
    });

    it("should handle midnight boundary correctly", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date(2023, 5, 1, 0, 0, 0, 0) // June 1, 2023 in local time
      );

      const months = resolver.getAvailableMonths(2023);

      expect(months).toContain(5); // June (5)
      expect(months).toHaveLength(6);
    });

    it("should handle end of day boundary correctly", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-06-30T12:00:00.000Z")
      );

      const months = resolver.getAvailableMonths(2023);

      expect(months).toContain(5); // June (5)
      expect(months).toHaveLength(6);
    });

  });

  describe("Integration Scenarios", () => {
    it("should work correctly for complete workflow in current year", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-06-15T12:00:00.000Z")
      );

      const currentYear = resolver.getCurrentYear();
      const availableMonths = resolver.getAvailableMonths(currentYear);
      const defaultMonth = resolver.resolveDefaultMonth(currentYear);

      expect(currentYear).toBe(2023);
      expect(availableMonths).toEqual([0, 1, 2, 3, 4, 5]);
      expect(defaultMonth).toBe(6); // June + 1
    });

    it("should work correctly for system start year workflow", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const availableMonths = resolver.getAvailableMonths(2015);
      const defaultMonth = resolver.resolveDefaultMonth(2015);

      expect(availableMonths).toEqual([10, 11]);
      expect(defaultMonth).toBe(11);
    });

    it("should work correctly for past year workflow", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const availableMonths = resolver.getAvailableMonths(2020);
      const defaultMonth = resolver.resolveDefaultMonth(2020);

      expect(availableMonths).toHaveLength(12);
      expect(defaultMonth).toBe(1);
    });

    it("should handle December edge case correctly", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-12-31T12:00:00.000Z")
      );

      const currentYear = resolver.getCurrentYear();
      const availableMonths = resolver.getAvailableMonths(currentYear);
      const defaultMonth = resolver.resolveDefaultMonth(currentYear);

      expect(currentYear).toBe(2023);
      expect(availableMonths).toHaveLength(12);
      expect(defaultMonth).toBe(12);
    });

    it("should handle January edge case correctly", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date(2023, 0, 1, 0, 0, 0, 0) // January 1, 2023 in local time
      );

      const currentYear = resolver.getCurrentYear();
      const availableMonths = resolver.getAvailableMonths(currentYear);
      const defaultMonth = resolver.resolveDefaultMonth(currentYear);

      expect(currentYear).toBe(2023);
      expect(availableMonths).toEqual([0]);
      expect(defaultMonth).toBe(1);
    });
  });

  describe("Consistency and Immutability", () => {
    it("should return consistent results for multiple calls", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const months1 = resolver.getAvailableMonths(2020);
      const months2 = resolver.getAvailableMonths(2020);
      const months3 = resolver.getAvailableMonths(2020);

      expect(months1).toEqual(months2);
      expect(months2).toEqual(months3);
    });

  });

  describe("Time-dependent Behavior", () => {
    it("should correctly differentiate years based on date", () => {
      const resolver2020 = new DefaultMonthResolver(() => new Date("2020-06-15"));
      const resolver2023 = new DefaultMonthResolver(() => new Date("2023-06-15"));

      // For 2020 resolver, 2019 is past, 2020 is current, 2021 is future
      expect(resolver2020.getAvailableMonths(2019)).toHaveLength(12);
      expect(resolver2020.getAvailableMonths(2020)).toHaveLength(6);
      expect(resolver2020.getAvailableMonths(2021)).toEqual([]);

      // For 2023 resolver, 2020 is past, 2023 is current, 2024 is future
      expect(resolver2023.getAvailableMonths(2020)).toHaveLength(12);
      expect(resolver2023.getAvailableMonths(2023)).toHaveLength(6);
      expect(resolver2023.getAvailableMonths(2024)).toEqual([]);
    });

    it("should handle different months in same year", () => {
      const resolverJan = new DefaultMonthResolver(() => new Date("2023-01-15"));
      const resolverJun = new DefaultMonthResolver(() => new Date("2023-06-15"));
      const resolverDec = new DefaultMonthResolver(() => new Date("2023-12-15"));

      expect(resolverJan.getAvailableMonths(2023)).toHaveLength(1);
      expect(resolverJun.getAvailableMonths(2023)).toHaveLength(6);
      expect(resolverDec.getAvailableMonths(2023)).toHaveLength(12);
    });
  });
});
