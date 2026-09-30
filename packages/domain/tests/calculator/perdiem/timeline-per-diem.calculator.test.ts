import { beforeEach, describe, expect, it } from "vitest";
import { TimelinePerDiemCalculator } from "../../../src/calculator/perdiem/timeline-per-diem.calculator.js";

describe("TimelinePerDiemCalculator rates", () => {
  let calculator: TimelinePerDiemCalculator;

  beforeEach(() => {
    calculator = new TimelinePerDiemCalculator();
  });

  describe("timeline boundaries", () => {
    it("returns zero before the supported November 2015 period", () => {
      expect(calculator.calculateRate({ year: 2015, month: 10 })).toBe(0);
      expect(calculator.calculateRate({ year: 2014, month: 12 })).toBe(0);
    });

    it("uses the provisional 29.50 rate from November 2015", () => {
      expect(calculator.calculateRate({ year: 2015, month: 11 })).toBe(29.5);
      expect(calculator.calculateRate({ year: 2020, month: 12 })).toBe(29.5);
    });

    it("uses the provisional 31.60 rate from January 2021", () => {
      expect(calculator.calculateRate({ year: 2021, month: 1 })).toBe(31.6);
      expect(calculator.calculateRate({ year: 2022, month: 9 })).toBe(31.6);
    });

    it("uses the verified 33.90 rate from October 2022", () => {
      expect(calculator.calculateRate({ year: 2022, month: 10 })).toBe(33.9);
      expect(calculator.calculateRate({ year: 2024, month: 8 })).toBe(33.9);
    });

    it("uses the verified 36.30 rate from September 2024", () => {
      expect(calculator.calculateRate({ year: 2024, month: 9 })).toBe(36.3);
      expect(calculator.calculateRate({ year: 2030, month: 1 })).toBe(36.3);
    });
  });

  it("keeps the rate stable within each effective period", () => {
    expect(calculator.calculateRate({ year: 2015, month: 11 })).toBe(
      calculator.calculateRate({ year: 2020, month: 12 }),
    );
    expect(calculator.calculateRate({ year: 2021, month: 1 })).toBe(
      calculator.calculateRate({ year: 2022, month: 9 }),
    );
    expect(calculator.calculateRate({ year: 2022, month: 10 })).toBe(
      calculator.calculateRate({ year: 2024, month: 8 }),
    );
  });
});
