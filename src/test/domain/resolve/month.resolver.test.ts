import { describe, it, expect } from "vitest";
import { DefaultMonthResolver } from "@/domain/resolve/month.resolver";

describe("DefaultMonthResolver", () => {
  const SYSTEM_START_YEAR = 2015;

  const HEBREW_MONTH_NAMES = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];

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
          () => new Date("2023-05-01T00:00:00.000Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4]);
      });

      it("should handle last day of month correctly", () => {
        const resolver = new DefaultMonthResolver(
          () => new Date("2023-07-31T23:59:59.999Z")
        );

        const result = resolver.getAvailableMonths(2023);

        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
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

  describe("getAvailableMonthOptions", () => {
    it("should return month options with Hebrew names for 2020", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.getAvailableMonthOptions(2020);

      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({ value: 0, label: "ינואר" });
      expect(result[1]).toEqual({ value: 1, label: "פברואר" });
      expect(result[11]).toEqual({ value: 11, label: "דצמבר" });
    });

    it("should return empty array for year before system start", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.getAvailableMonthOptions(2014);

      expect(result).toEqual([]);
    });

    it("should return November and December for system start year", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.getAvailableMonthOptions(SYSTEM_START_YEAR);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ value: 10, label: "נובמבר" });
      expect(result[1]).toEqual({ value: 11, label: "דצמבר" });
    });

    it("should return months with correct labels for current year", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-03-15T12:00:00.000Z")
      );

      const result = resolver.getAvailableMonthOptions(2023);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ value: 0, label: "ינואר" });
      expect(result[1]).toEqual({ value: 1, label: "פברואר" });
      expect(result[2]).toEqual({ value: 2, label: "מרץ" });
    });

    it("should return all months with Hebrew names for past year", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.getAvailableMonthOptions(2022);

      expect(result).toHaveLength(12);
      result.forEach((option, index) => {
        expect(option.value).toBe(index);
        expect(option.label).toBe(HEBREW_MONTH_NAMES[index]);
      });
    });

    it("should return empty array for future year", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const result = resolver.getAvailableMonthOptions(2024);

      expect(result).toEqual([]);
    });

    it("should map month indices to correct Hebrew names", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-12-31"));

      const result = resolver.getAvailableMonthOptions(2023);

      expect(result).toHaveLength(12);
      expect(result[0].label).toBe("ינואר"); // January
      expect(result[5].label).toBe("יוני"); // June
      expect(result[11].label).toBe("דצמבר"); // December
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

  describe("getMonthName", () => {
    it("should return correct Hebrew name for January (0)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(0);

      expect(result).toBe("ינואר");
    });

    it("should return correct Hebrew name for February (1)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(1);

      expect(result).toBe("פברואר");
    });

    it("should return correct Hebrew name for March (2)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(2);

      expect(result).toBe("מרץ");
    });

    it("should return correct Hebrew name for April (3)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(3);

      expect(result).toBe("אפריל");
    });

    it("should return correct Hebrew name for May (4)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(4);

      expect(result).toBe("מאי");
    });

    it("should return correct Hebrew name for June (5)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(5);

      expect(result).toBe("יוני");
    });

    it("should return correct Hebrew name for July (6)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(6);

      expect(result).toBe("יולי");
    });

    it("should return correct Hebrew name for August (7)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(7);

      expect(result).toBe("אוגוסט");
    });

    it("should return correct Hebrew name for September (8)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(8);

      expect(result).toBe("ספטמבר");
    });

    it("should return correct Hebrew name for October (9)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(9);

      expect(result).toBe("אוקטובר");
    });

    it("should return correct Hebrew name for November (10)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(10);

      expect(result).toBe("נובמבר");
    });

    it("should return correct Hebrew name for December (11)", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getMonthName(11);

      expect(result).toBe("דצמבר");
    });

    it("should handle all month indices 0-11", () => {
      const resolver = new DefaultMonthResolver();

      for (let i = 0; i < 12; i++) {
        const name = resolver.getMonthName(i);
        expect(name).toBe(HEBREW_MONTH_NAMES[i]);
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getAllMonthNames", () => {
    it("should return all 12 Hebrew month names", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getAllMonthNames();

      expect(result).toHaveLength(12);
      expect(result).toEqual(HEBREW_MONTH_NAMES);
    });

    it("should return array with correct order", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getAllMonthNames();

      expect(result[0]).toBe("ינואר");
      expect(result[1]).toBe("פברואר");
      expect(result[2]).toBe("מרץ");
      expect(result[11]).toBe("דצמבר");
    });

    it("should return a new array (not reference)", () => {
      const resolver = new DefaultMonthResolver();

      const result1 = resolver.getAllMonthNames();
      const result2 = resolver.getAllMonthNames();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different references
    });

    it("should not be affected by modifications", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getAllMonthNames();
      result[0] = "MODIFIED";

      const newResult = resolver.getAllMonthNames();
      expect(newResult[0]).toBe("ינואר");
    });

    it("should contain only Hebrew strings", () => {
      const resolver = new DefaultMonthResolver();

      const result = resolver.getAllMonthNames();

      result.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
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
        () => new Date("2023-06-01T00:00:00.000Z")
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

    it("should handle invalid month index gracefully", () => {
      const resolver = new DefaultMonthResolver();

      // JavaScript array access returns undefined for out-of-bounds
      const result = resolver.getMonthName(12);

      expect(result).toBeUndefined();
    });
  });

  describe("Integration Scenarios", () => {
    it("should work correctly for complete workflow in current year", () => {
      const resolver = new DefaultMonthResolver(
        () => new Date("2023-06-15T12:00:00.000Z")
      );

      const currentYear = resolver.getCurrentYear();
      const availableMonths = resolver.getAvailableMonths(currentYear);
      const monthOptions = resolver.getAvailableMonthOptions(currentYear);
      const defaultMonth = resolver.resolveDefaultMonth(currentYear);

      expect(currentYear).toBe(2023);
      expect(availableMonths).toEqual([0, 1, 2, 3, 4, 5]);
      expect(monthOptions).toHaveLength(6);
      expect(defaultMonth).toBe(6); // June + 1
    });

    it("should work correctly for system start year workflow", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const availableMonths = resolver.getAvailableMonths(2015);
      const monthOptions = resolver.getAvailableMonthOptions(2015);
      const defaultMonth = resolver.resolveDefaultMonth(2015);

      expect(availableMonths).toEqual([10, 11]);
      expect(monthOptions).toHaveLength(2);
      expect(monthOptions[0].label).toBe("נובמבר");
      expect(defaultMonth).toBe(11);
    });

    it("should work correctly for past year workflow", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const availableMonths = resolver.getAvailableMonths(2020);
      const monthOptions = resolver.getAvailableMonthOptions(2020);
      const defaultMonth = resolver.resolveDefaultMonth(2020);
      const allNames = resolver.getAllMonthNames();

      expect(availableMonths).toHaveLength(12);
      expect(monthOptions).toHaveLength(12);
      expect(defaultMonth).toBe(1);
      expect(allNames).toHaveLength(12);
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
        () => new Date("2023-01-01T00:00:00.000Z")
      );

      const currentYear = resolver.getCurrentYear();
      const availableMonths = resolver.getAvailableMonths(currentYear);
      const defaultMonth = resolver.resolveDefaultMonth(currentYear);
      const monthName = resolver.getMonthName(0);

      expect(currentYear).toBe(2023);
      expect(availableMonths).toEqual([0]);
      expect(defaultMonth).toBe(1);
      expect(monthName).toBe("ינואר");
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

    it("should not be affected by external state changes", () => {
      const resolver = new DefaultMonthResolver(() => new Date("2023-06-15"));

      const options1 = resolver.getAvailableMonthOptions(2020);
      options1[0].label = "MODIFIED";

      const options2 = resolver.getAvailableMonthOptions(2020);

      expect(options2[0].label).toBe("ינואר");
    });

    it("should maintain immutability for month names array", () => {
      const resolver = new DefaultMonthResolver();

      const names1 = resolver.getAllMonthNames();
      names1.push("EXTRA");

      const names2 = resolver.getAllMonthNames();

      expect(names2).toHaveLength(12);
      expect(names2).not.toContain("EXTRA");
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
