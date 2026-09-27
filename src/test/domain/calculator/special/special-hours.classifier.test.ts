import { describe, expect, it } from "vitest";
import { SpecialHoursClassifier } from "@/domain/calculator/special/special-hours.classifier";
import type { TimelineInterval } from "@/domain/types/types";

const specialInterval = (start: number, end: number): TimelineInterval => ({
  point: { start, end },
  category: "special",
  calendarDate: "2026-08-08",
  dayOffset: 0,
  sourceShiftId: "shift-1",
});

describe("SpecialHoursClassifier", () => {
  const classifier = new SpecialHoursClassifier();

  it("classifies daytime special hours as 150% and night as 200%", () => {
    const result = classifier.calculate({
      intervals: [specialInterval(20 * 60, 24 * 60)],
    });

    expect(result).toEqual([
      {
        point: { start: 1200, end: 1320 },
        calendarDate: "2026-08-08",
        dayOffset: 0,
        sourceShiftId: "shift-1",
        kind: "special150",
        percent: 1.5,
      },
      {
        point: { start: 1320, end: 1440 },
        calendarDate: "2026-08-08",
        dayOffset: 0,
        sourceShiftId: "shift-1",
        kind: "special200",
        percent: 2,
      },
    ]);
  });

  it("classifies the 00:00–06:00 portion as 200%", () => {
    const result = classifier.calculate({
      intervals: [
        {
          ...specialInterval(1440, 1800),
          calendarDate: "2026-08-09",
          dayOffset: 1,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      point: { start: 1440, end: 1800 },
      kind: "special200",
      percent: 2,
    });
  });

  it("ignores regular intervals", () => {
    const result = classifier.calculate({
      intervals: [
        {
          ...specialInterval(8 * 60, 10 * 60),
          category: "regular",
        },
      ],
    });

    expect(result).toEqual([]);
  });
});
