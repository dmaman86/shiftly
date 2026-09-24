import { describe, expect, it } from "vitest";
import { WorkDayType } from "@/domain/constants";
import {
  classifyLabeledSegments,
  selectRegularIntervals,
  selectSpecialIntervals,
} from "@/domain/classification";
import { ShiftSegmentCalculator } from "@/domain/calculator/shiftSegment.calculator";
import { DateService } from "@/domain/services/date.service";
import type { LabeledSegmentRange, Point, WorkDayMeta } from "@/domain/types/types";

const regularKeys = new Set(["hours100", "hours20", "hours50"]);

const assertPartition = (segments: LabeledSegmentRange[], point: Point) => {
  const ordered = [...segments].sort((a, b) => a.point.start - b.point.start);

  expect(ordered.every((segment) => segment.point.start < segment.point.end)).toBe(true);
  expect(ordered.every((segment) => segment.point.start >= point.start)).toBe(true);
  expect(ordered.every((segment) => segment.point.end <= point.end)).toBe(true);

  for (let index = 1; index < ordered.length; index += 1) {
    expect(ordered[index].point.start).toBeGreaterThanOrEqual(
      ordered[index - 1].point.end,
    );
  }

  const classifiedMinutes = ordered.reduce(
    (total, segment) => total + segment.point.end - segment.point.start,
    0,
  );

  expect(classifiedMinutes).toBe(point.end - point.start);
};

const meta = (typeDay: WorkDayType, date = "2024-01-05"): WorkDayMeta => ({
  date,
  typeDay,
  crossDayContinuation: false,
});

describe("timeline classification invariants", () => {
  const calculator = new ShiftSegmentCalculator(new DateService());

  it("partitions a regular day without special intervals", () => {
    const point = { start: 0, end: 1440 };
    const segments = calculator.calculate({
      point,
      meta: meta(WorkDayType.Regular, "2024-01-01"),
    });

    assertPartition(segments, point);
    expect(segments.every((segment) => regularKeys.has(segment.key))).toBe(true);
  });

  it("partitions a full special day without regular intervals", () => {
    const point = { start: 0, end: 1440 };
    const segments = calculator.calculate({
      point,
      meta: meta(WorkDayType.SpecialFull, "2024-01-06"),
    });

    assertPartition(segments, point);
    expect(segments.every((segment) => segment.key.startsWith("shabbat"))).toBe(true);
  });

  it("partitions a Friday partial interval into regular and special time", () => {
    const point = { start: 14 * 60 + 30, end: 23 * 60 };
    const segments = calculator.calculate({
      point,
      meta: meta(WorkDayType.SpecialPartialStart),
    });

    assertPartition(segments, point);
    expect(segments.some((segment) => regularKeys.has(segment.key))).toBe(true);
    expect(segments.some((segment) => segment.key.startsWith("shabbat"))).toBe(true);
  });

  it("maps legacy rate keys to explicit timeline categories", () => {
    const classified = classifyLabeledSegments({
      sourceShiftId: "shift-1",
      segments: [
        { point: { start: 360, end: 600 }, percent: 1, key: "hours100" },
        { point: { start: 840, end: 1020 }, percent: 0.2, key: "hours20" },
        { point: { start: 1320, end: 1440 }, percent: 1.5, key: "shabbat150" },
      ],
    });

    expect(classified).toEqual([
      {
        point: { start: 360, end: 600 },
        category: "regular",
        rule: "regular",
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 840, end: 1020 },
        category: "regular",
        rule: "evening",
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1320, end: 1440 },
        category: "special",
        rule: "special150",
        sourceShiftId: "shift-1",
      },
    ]);
  });

  it("selects regular and special streams without overlap", () => {
    const intervals = classifyLabeledSegments({
      segments: [
        { point: { start: 0, end: 60 }, percent: 1, key: "hours100" },
        { point: { start: 60, end: 120 }, percent: 0.5, key: "hours50" },
        { point: { start: 120, end: 180 }, percent: 1.5, key: "shabbat150" },
      ],
    });

    expect(selectRegularIntervals(intervals)).toHaveLength(2);
    expect(selectSpecialIntervals(intervals)).toHaveLength(1);
    expect(
      selectRegularIntervals(intervals).some((interval) => interval.category === "special"),
    ).toBe(false);
  });
});
