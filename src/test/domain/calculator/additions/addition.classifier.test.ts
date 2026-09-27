import { describe, expect, it } from "vitest";
import {
  AdditionClassifier,
  currentAdditionPolicy,
} from "@/domain/calculator/additions/addition.classifier";
import type { TimelineInterval } from "@/domain/types/types";

const regularInterval = (
  start: number,
  end: number,
  category: TimelineInterval["category"] = "regular",
): TimelineInterval => ({
  point: { start, end },
  category,
  calendarDate: "2026-08-03",
  dayOffset: 0,
  sourceShiftId: "shift-1",
});

describe("AdditionClassifier", () => {
  it("classifies evening and night additions independently from base hours", () => {
    const result = new AdditionClassifier().calculate({
      intervals: [regularInterval(14 * 60, 22 * 60 + 2 * 60)],
    });

    expect(result).toEqual([
      {
        point: { start: 840, end: 1320 },
        calendarDate: "2026-08-03",
        dayOffset: 0,
        sourceShiftId: "shift-1",
        kind: "evening",
        percent: 0.2,
      },
      {
        point: { start: 1320, end: 1440 },
        calendarDate: "2026-08-03",
        dayOffset: 0,
        sourceShiftId: "shift-1",
        kind: "night",
        percent: 0.5,
      },
    ]);
  });

  it("does not apply evening addition below the three-hour qualification", () => {
    const result = new AdditionClassifier().calculate({
      intervals: [regularInterval(14 * 60, 16 * 60)],
    });

    expect(result).toEqual([]);
  });

  it("does not classify daytime regular hours as evening additions", () => {
    const result = new AdditionClassifier().calculate({
      intervals: [regularInterval(6 * 60, 14 * 60)],
    });

    expect(result).toEqual([]);
  });

  it("qualifies only regular evening time", () => {
    const result = new AdditionClassifier().calculate({
      intervals: [
        regularInterval(14 * 60, 18 * 60, "special"),
        regularInterval(18 * 60, 22 * 60),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      point: { start: 1080, end: 1320 },
      kind: "evening",
      percent: 0.2,
    });
  });

  it("allows a future policy to disable additions", () => {
    const result = new AdditionClassifier(() => ({
      ...currentAdditionPolicy("2026-08-03"),
      eveningPercent: null,
      nightPercent: null,
    })).calculate({
      intervals: [regularInterval(14 * 60, 24 * 60)],
    });

    expect(result).toEqual([]);
  });
});
