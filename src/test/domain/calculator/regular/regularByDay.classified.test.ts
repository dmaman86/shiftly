import { describe, expect, it } from "vitest";
import { WorkDayType } from "@/domain/constants";
import { RegularByDayCalculator } from "@/domain/calculator/regular/regularByDay.calculator";
import type { ClassifiedInterval } from "@/domain/types/types";

describe("RegularByDayCalculator classified input", () => {
  const calculator = new RegularByDayCalculator();
  const meta = {
    date: "2024-01-05",
    typeDay: WorkDayType.SpecialPartialStart,
    crossDayContinuation: false,
  };

  it("applies progression only to regular intervals", () => {
    const intervals: ClassifiedInterval[] = [
      {
        point: { start: 360, end: 600 },
        category: "regular",
        rule: "regular",
      },
      {
        point: { start: 600, end: 840 },
        category: "regular",
        rule: "evening",
      },
      {
        point: { start: 840, end: 1200 },
        category: "special",
        rule: "special150",
      },
    ];

    const result = calculator.calculateClassified({
      intervals,
      standardHours: 6.67,
      meta,
    });

    expect(result.hours100.hours).toBe(6.67);
    expect(result.hours125.hours).toBeCloseTo(1.33, 10);
    expect(result.hours150.hours).toBe(0);
  });

  it("keeps a full special day out of regular progression", () => {
    const result = calculator.calculateClassified({
      intervals: [
        {
          point: { start: 0, end: 600 },
          category: "special",
          rule: "special150",
        },
      ],
      standardHours: 6.67,
      meta: {
        date: "2024-01-06",
        typeDay: WorkDayType.SpecialFull,
        crossDayContinuation: false,
      },
    });

    expect(result.hours100.hours).toBe(0);
    expect(result.hours125.hours).toBe(0);
    expect(result.hours150.hours).toBe(0);
  });
});
