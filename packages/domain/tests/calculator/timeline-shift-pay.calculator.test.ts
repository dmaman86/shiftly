import { describe, expect, it } from "vitest";
import { TimelineShiftPayCalculator } from "../../src/calculator/timeline-shift-pay.calculator.js";
import type { TimelineInterval } from "../../src/types/types.js";
import { AdditionClassifier } from "../../src/calculator/additions/addition.classifier.js";

const interval = (
  start: number,
  end: number,
  category: TimelineInterval["category"],
  date = "2026-08-03",
  dayOffset = 0,
): TimelineInterval => ({
  point: { start, end },
  category,
  calendarDate: date,
  dayOffset,
});

describe("TimelineShiftPayCalculator", () => {
  it("preserves a custom evening percentage instead of using the default", () => {
    const calculator = new TimelineShiftPayCalculator(undefined, new AdditionClassifier(() => ({
      eveningPercent: 0.3,
      nightPercent: 0.5,
      eveningQualificationMinutes: 180,
    })));
    const { extra } = calculator.calculate({
      standardHours: 8,
      intervals: [interval(14 * 60, 18 * 60, "regular")],
    });

    expect(extra["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });
    expect(extra.hours20.hours).toBe(0);
    expect(Object.values(extra).reduce((sum, segment) =>
      sum + segment.hours * segment.percent * 50, 0)).toBe(60);
  });

  it("keeps distinct rates across calendar days in the same shift", () => {
    const calculator = new TimelineShiftPayCalculator(undefined, new AdditionClassifier((date) => ({
      eveningPercent: date === "2026-08-03" ? 0.2 : 0.3,
      nightPercent: date === "2026-08-03" ? 0.5 : 0.6,
      eveningQualificationMinutes: 180,
    })));
    const { extra } = calculator.calculate({
      standardHours: 8,
      intervals: [
        interval(14 * 60, 24 * 60, "regular"),
        interval(24 * 60, 30 * 60, "regular", "2026-08-04", 1),
        interval(38 * 60, 42 * 60, "regular", "2026-08-04", 1),
      ],
    });

    expect(extra.hours20).toEqual({ percent: 0.2, hours: 8 });
    expect(extra.hours50).toEqual({ percent: 0.5, hours: 2 });
    expect(extra["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });
    expect(extra["night:0.6"]).toEqual({ percent: 0.6, hours: 6 });
  });

  it.each([null, 0])("does not add hours when the policy disables additions with %s", (percent) => {
    const calculator = new TimelineShiftPayCalculator(undefined, new AdditionClassifier(() => ({
      eveningPercent: percent,
      nightPercent: percent,
      eveningQualificationMinutes: 180,
    })));
    const { extra } = calculator.calculate({
      standardHours: 8,
      intervals: [interval(14 * 60, 24 * 60, "regular")],
    });

    expect(extra).toEqual({
      hours20: { percent: 0.2, hours: 0 },
      hours50: { percent: 0.5, hours: 0 },
    });
  });

  it("composes base, additions, and special pipelines by calendar day", () => {
    const result = new TimelineShiftPayCalculator().calculate({
      standardHours: 6.67,
      intervals: [
        interval(0, 6 * 60, "regular"),
        interval(14 * 60, 22 * 60, "regular"),
        interval(22 * 60, 24 * 60, "regular"),
        interval(24 * 60, 30 * 60, "special", "2026-08-04", 1),
        interval(30 * 60, 32 * 60, "special", "2026-08-04", 1),
      ],
    });

    expect(result.regular.hours100.hours).toBeCloseTo(6.67, 10);
    expect(result.regular.hours125.hours).toBe(2);
    expect(result.regular.hours150.hours).toBeCloseTo(7.33, 10);
    expect(result.extra.hours20.hours).toBe(8);
    expect(result.extra.hours50.hours).toBe(8);
    expect(result.special.shabbat200.hours).toBe(6);
    expect(result.special.shabbat150.hours).toBe(2);
  });

  it("does not reset base progression at midnight", () => {
    const result = new TimelineShiftPayCalculator().calculate({
      standardHours: 8,
      intervals: [
        interval(20 * 60, 24 * 60, "regular", "2026-08-03"),
        interval(24 * 60, 30 * 60, "regular", "2026-08-04", 1),
      ],
    });

    expect(result.regular).toEqual({
      hours100: { percent: 1, hours: 8 },
      hours125: { percent: 1.25, hours: 2 },
      hours150: { percent: 1.5, hours: 0 },
    });
  });
});
