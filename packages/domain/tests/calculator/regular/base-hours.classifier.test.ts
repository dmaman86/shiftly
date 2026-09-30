import { describe, expect, it } from "vitest";
import { BaseHoursClassifier } from "../../../src/calculator/regular/base-hours.classifier.js";
import type { TimelineInterval } from "../../../src/types/types.js";

const regularInterval = (
  start: number,
  end: number,
  dayOffset = 0,
): TimelineInterval => ({
  point: { start, end },
  category: "regular",
  calendarDate: dayOffset === 0 ? "2026-08-03" : "2026-08-04",
  dayOffset,
});

describe("BaseHoursClassifier", () => {
  const classifier = new BaseHoursClassifier();

  it("applies the 6.67, 2, remainder progression without resetting at boundaries", () => {
    const result = classifier.calculate({
      intervals: [
        regularInterval(0, 4 * 60),
        regularInterval(4 * 60, 6 * 60 + 40),
        regularInterval(14 * 60, 17 * 60),
      ],
      standardHours: 6.67,
    });

    expect(result.hours100.hours).toBeCloseTo(6.67, 10);
    expect(result.hours125.hours).toBe(2);
    expect(result.hours150.hours).toBeCloseTo(0.9966666667, 10);
  });

  it("ignores special intervals", () => {
    const result = classifier.calculate({
      intervals: [
        regularInterval(0, 6 * 60),
        {
          point: { start: 6 * 60, end: 12 * 60 },
          category: "special",
          calendarDate: "2026-08-03",
          dayOffset: 0,
        },
      ],
      standardHours: 6.67,
    });

    expect(result.hours100.hours).toBe(6);
    expect(result.hours125.hours).toBe(0);
    expect(result.hours150.hours).toBe(0);
  });

  it("keeps progression across multiple calendar days", () => {
    const result = classifier.calculate({
      intervals: [
        regularInterval(0, 8 * 60, 0),
        regularInterval(24 * 60, 26 * 60, 1),
      ],
      standardHours: 6.67,
    });

    expect(result.hours100.hours).toBeCloseTo(6.67, 10);
    expect(result.hours125.hours).toBe(2);
    expect(result.hours150.hours).toBeCloseTo(1.33, 10);
  });
});
