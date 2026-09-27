import { describe, expect, it } from "vitest";
import { TimelineShiftPayCalculator } from "@/domain/calculator/timeline-shift-pay.calculator";
import type { TimelineInterval } from "@/domain/types/types";

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
