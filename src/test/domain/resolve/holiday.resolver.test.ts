import { describe, it, expect, beforeEach } from "vitest";
import { HolidayResolverService } from "@/domain/resolve/holiday.resolver";
import { WorkDayType } from "@/constants/fields.constant";
import { Weekend } from "@/constants/hebrew.dates.constant";

describe("HolidayResolverService", () => {
  let resolver: HolidayResolverService;

  beforeEach(() => {
    resolver = new HolidayResolverService();
  });

  // Helper function to create resolve params
  const createResolveParams = (
    weekday: number,
    eventTitles: string[] = []
  ) => ({
    weekday,
    eventTitles,
  });

  describe("isPaidHoliday - Basic Paid Holidays", () => {
    it("should identify Rosh Hashana as paid holiday", () => {
      const params = createResolveParams(2, ["Rosh Hashana"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Rosh Hashana II as paid holiday", () => {
      const params = createResolveParams(3, ["Rosh Hashana II"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Yom Kippur as paid holiday", () => {
      const params = createResolveParams(2, ["Yom Kippur"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Sukkot I as paid holiday", () => {
      const params = createResolveParams(1, ["Sukkot I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Shmini Atzeret as paid holiday", () => {
      const params = createResolveParams(3, ["Shmini Atzeret"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Pesach I as paid holiday", () => {
      const params = createResolveParams(0, ["Pesach I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Yom HaAtzma’ut as paid holiday", () => {
      const params = createResolveParams(4, ["Yom HaAtzma’ut"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Shavuot I as paid holiday", () => {
      const params = createResolveParams(0, ["Shavuot I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });
  });

  describe("isPaidHoliday - StartsWith Logic", () => {
    it("should identify holiday starting with 'Rosh Hashana' as paid", () => {
      const params = createResolveParams(2, ["Rosh Hashana III"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify 'Rosh Hashana Eve' as paid holiday", () => {
      const params = createResolveParams(3, ["Rosh Hashana Eve"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should not identify non-paid holidays", () => {
      const params = createResolveParams(2, ["Chanukah"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should not identify Pesach II as paid holiday", () => {
      const params = createResolveParams(1, ["Pesach II"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });
  });

  describe("isPartialStart - Erev Holidays", () => {
    it("should identify Erev Yom Kippur as partial start", () => {
      const params = createResolveParams(3, ["Erev Yom Kippur"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should identify Erev Pesach as partial start", () => {
      const params = createResolveParams(4, ["Erev Pesach"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should identify Erev Sukkot as partial start", () => {
      const params = createResolveParams(2, ["Erev Sukkot"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should identify Erev Shavuot as partial start", () => {
      const params = createResolveParams(0, ["Erev Shavuot"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should identify any event starting with 'Erev' as partial start", () => {
      const params = createResolveParams(1, ["Erev CustomHoliday"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });
  });

  describe("isPartialStart - Special Days", () => {
    it("should identify Yom HaZikaron as partial start", () => {
      const params = createResolveParams(3, ["Yom HaZikaron"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should identify Sukkot VII (Hoshana Rabba) as partial start", () => {
      const params = createResolveParams(4, ["Sukkot VII (Hoshana Rabba)"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });
  });

  describe("Weekend Detection", () => {
    it("should identify Saturday (6) as SpecialFull", () => {
      const params = createResolveParams(Weekend.SATURDAY, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Friday (5) as SpecialPartialStart", () => {
      const params = createResolveParams(Weekend.FRIDAY, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should prioritize Saturday over empty events", () => {
      const params = createResolveParams(Weekend.SATURDAY, ["Some Event"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should identify Friday even with regular events", () => {
      const params = createResolveParams(Weekend.FRIDAY, ["Regular Event"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });
  });

  describe("Regular Weekdays", () => {
    it("should identify Sunday (0) as Regular", () => {
      const params = createResolveParams(0, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should identify Monday (1) as Regular", () => {
      const params = createResolveParams(1, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should identify Tuesday (2) as Regular", () => {
      const params = createResolveParams(2, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should identify Wednesday (3) as Regular", () => {
      const params = createResolveParams(3, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should identify Thursday (4) as Regular", () => {
      const params = createResolveParams(4, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty eventTitles array", () => {
      const params = createResolveParams(2, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should handle multiple events with no special significance", () => {
      const params = createResolveParams(1, [
        "Regular Event",
        "Another Event",
        "Third Event",
      ]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should handle unknown holiday names", () => {
      const params = createResolveParams(3, ["Unknown Holiday"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });

    it("should handle case-sensitive event names correctly", () => {
      const params = createResolveParams(2, ["rosh hashana"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });
  });

  describe("Priority Resolution Logic", () => {
    it("should prioritize Saturday over paid holiday", () => {
      const params = createResolveParams(Weekend.SATURDAY, ["Pesach I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should prioritize paid holiday over Friday", () => {
      const params = createResolveParams(Weekend.FRIDAY, ["Yom Kippur"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should prioritize Erev over regular weekday", () => {
      const params = createResolveParams(2, ["Erev Pesach"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should prioritize Friday over Yom HaZikaron", () => {
      const params = createResolveParams(Weekend.FRIDAY, ["Yom HaZikaron"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should return SpecialFull for paid holiday on weekday", () => {
      const params = createResolveParams(3, ["Sukkot I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });
  });

  describe("Multiple Events Scenarios", () => {
    it("should detect paid holiday among multiple events", () => {
      const params = createResolveParams(2, [
        "Some Event",
        "Pesach I",
        "Another Event",
      ]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should detect Erev among multiple events", () => {
      const params = createResolveParams(3, [
        "Morning Event",
        "Erev Yom Kippur",
        "Evening Event",
      ]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should prioritize paid holiday over Erev in same day", () => {
      const params = createResolveParams(2, ["Erev Something", "Pesach I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should handle both Yom HaZikaron and Erev in events", () => {
      const params = createResolveParams(3, [
        "Yom HaZikaron",
        "Erev Yom HaAtzma’ut",
      ]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });
  });

  describe("Real-world Integration Scenarios", () => {
    it("should handle typical Friday without holidays", () => {
      const params = createResolveParams(Weekend.FRIDAY, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should handle typical Saturday (Shabbat)", () => {
      const params = createResolveParams(Weekend.SATURDAY, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should handle Pesach I on Tuesday", () => {
      const params = createResolveParams(2, ["Pesach I"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should handle Erev Pesach on Monday", () => {
      const params = createResolveParams(1, ["Erev Pesach"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should handle Yom HaAtzma’ut (Independence Day)", () => {
      const params = createResolveParams(4, ["Yom HaAtzma’ut"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialFull);
    });

    it("should handle Yom HaZikaron (Memorial Day - eve of Independence)", () => {
      const params = createResolveParams(3, ["Yom HaZikaron"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should handle Hoshana Rabba as partial start", () => {
      const params = createResolveParams(0, ["Sukkot VII (Hoshana Rabba)"]);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.SpecialPartialStart);
    });

    it("should handle regular Monday with no events", () => {
      const params = createResolveParams(1, []);

      const result = resolver.resolve(params);

      expect(result).toBe(WorkDayType.Regular);
    });
  });

  describe("Boundary and Consistency", () => {
    it("should consistently resolve same input", () => {
      const params = createResolveParams(3, ["Pesach I"]);

      const result1 = resolver.resolve(params);
      const result2 = resolver.resolve(params);

      expect(result1).toBe(result2);
      expect(result1).toBe(WorkDayType.SpecialFull);
    });

    it("should handle all weekdays (0-6) without errors", () => {
      for (let weekday = 0; weekday <= 6; weekday++) {
        const params = createResolveParams(weekday, []);
        const result = resolver.resolve(params);

        expect(result).toBeDefined();
        expect(Object.values(WorkDayType)).toContain(result);
      }
    });

    it("should return valid WorkDayType for any input", () => {
      const testCases = [
        createResolveParams(0, []),
        createResolveParams(5, ["Erev Pesach"]),
        createResolveParams(6, ["Pesach I"]),
        createResolveParams(2, ["Unknown Event"]),
      ];

      testCases.forEach((params) => {
        const result = resolver.resolve(params);
        expect(Object.values(WorkDayType)).toContain(result);
      });
    });
  });
});
