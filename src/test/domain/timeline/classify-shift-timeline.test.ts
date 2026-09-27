import { describe, expect, it } from "vitest";
import { WorkDayType } from "@/domain/constants";
import { classifyShiftTimeline } from "@/domain/timeline/classify-shift-timeline";
import { normalizeShiftTimeline } from "@/domain/timeline/normalize-shift";
import { DateService } from "@/domain/services/date.service";
import { ShiftService } from "@/domain/services/shift.service";
import type { Shift, WorkDayMeta } from "@/domain";

const dateService = new DateService();
const shiftService = new ShiftService(dateService);

const createShift = (start: string, end: string): Shift => ({
  id: "shift-1",
  start: { date: new Date(start) },
  end: { date: new Date(end) },
  isDuty: false,
});

const classify = (params: {
  start: string;
  end: string;
  meta: WorkDayMeta;
}) => {
  const timeline = normalizeShiftTimeline({
    shift: createShift(params.start, params.end),
    shiftService,
  });

  if (!timeline) throw new Error("Expected a valid shift");

  return classifyShiftTimeline({
    timeline,
    meta: params.meta,
    dateService,
  });
};

describe("classifyShiftTimeline", () => {
  it("keeps a regular cross-day shift continuous while preserving day identity", () => {
    const result = classify({
      start: "2026-09-25T14:30:00",
      end: "2026-09-26T07:00:00",
      meta: {
        date: "2026-09-25",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      },
    });

    expect(result).toEqual([
      {
        point: { start: 870, end: 1440 },
        category: "regular",
        calendarDate: "2026-09-25",
        dayOffset: 0,
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1440, end: 1860 },
        category: "regular",
        calendarDate: "2026-09-26",
        dayOffset: 1,
        sourceShiftId: "shift-1",
      },
    ]);
  });

  it("classifies a partial special start without salary rules", () => {
    const result = classify({
      start: "2026-08-07T14:30:00",
      end: "2026-08-07T23:00:00",
      meta: {
        date: "2026-08-07",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: false,
      },
    });

    expect(result).toEqual([
      {
        point: { start: 870, end: 1080 },
        category: "regular",
        calendarDate: "2026-08-07",
        dayOffset: 0,
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1080, end: 1380 },
        category: "special",
        calendarDate: "2026-08-07",
        dayOffset: 0,
        sourceShiftId: "shift-1",
      },
    ]);
  });

  it("classifies the continuation as special when the calendar says so", () => {
    const result = classify({
      start: "2026-08-07T22:00:00",
      end: "2026-08-08T07:00:00",
      meta: {
        date: "2026-08-07",
        typeDay: WorkDayType.SpecialPartialStart,
        crossDayContinuation: true,
      },
    });

    expect(result.every((interval) => interval.category === "special")).toBe(true);
    expect(result).toEqual([
      {
        point: { start: 1320, end: 1440 },
        category: "special",
        calendarDate: "2026-08-07",
        dayOffset: 0,
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1440, end: 1860 },
        category: "special",
        calendarDate: "2026-08-08",
        dayOffset: 1,
        sourceShiftId: "shift-1",
      },
    ]);
  });

  it("carries a full special day through 06:00 before regular continuation", () => {
    const result = classify({
      start: "2025-10-02T21:30:00",
      end: "2025-10-03T07:00:00",
      meta: {
        date: "2025-10-02",
        typeDay: WorkDayType.SpecialFull,
        crossDayContinuation: false,
      },
    });

    expect(result).toEqual([
      {
        point: { start: 1290, end: 1440 },
        category: "special",
        calendarDate: "2025-10-02",
        dayOffset: 0,
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1440, end: 1800 },
        category: "special",
        calendarDate: "2025-10-03",
        dayOffset: 1,
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1800, end: 1860 },
        category: "regular",
        calendarDate: "2025-10-03",
        dayOffset: 1,
        sourceShiftId: "shift-1",
      },
    ]);
  });
});
