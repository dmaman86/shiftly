import { describe, expect, it } from "vitest";
import { WorkDayType } from "../../src/constants/index.js";
import { classifyShiftTimeline } from "../../src/timeline/classify-shift-timeline.js";
import { normalizeShiftTimeline } from "../../src/timeline/normalize-shift.js";
import { DateService } from "../../src/services/date.service.js";
import { ShiftService } from "../../src/services/shift.service.js";
import { DefaultWorkDaysForMonthBuilder } from "../../src/builder/workdaysformonth.builder.js";
import { DefaultHolidayCalculator } from "../../src/calculator/holiday.calculator.js";
import { WorkDayInfoResolver } from "../../src/resolve/workdayinfo.resolver.js";
import { CalendarEventKind } from "../../src/types/types.js";
import type { Shift, WorkDayMeta } from "../../src/index.js";

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
  it("does not carry the first day's continuation flag into a third day across years", () => {
    const builder = new DefaultWorkDaysForMonthBuilder(
      new DefaultHolidayCalculator(),
      new WorkDayInfoResolver(),
      dateService,
    );
    const days = builder.build({
      year: 2026,
      month: 12,
      eventMap: { "2026-12-31": [{ kind: CalendarEventKind.PaidHoliday }] },
    });
    expect(days[29].meta.crossDayContinuation).toBe(true);
    const result = classify({
      start: "2026-12-30T18:00:00",
      end: "2027-01-01T08:00:00",
      meta: days[29].meta,
    });
    expect(result.map(({ point, category }) => ({ point, category }))).toEqual([
      { point: { start: 1080, end: 1440 }, category: "regular" },
      { point: { start: 1440, end: 2880 }, category: "special" },
      { point: { start: 2880, end: 3240 }, category: "special" },
      { point: { start: 3240, end: 3360 }, category: "regular" },
    ]);
  });

  it("uses calendar holidays beyond the next day across a month boundary", () => {
    const builder = new DefaultWorkDaysForMonthBuilder(
      new DefaultHolidayCalculator(),
      new WorkDayInfoResolver(),
      dateService,
    );
    const days = builder.build({
      year: 2026,
      month: 8,
      eventMap: {
        "2026-09-01": [{ kind: CalendarEventKind.PartialHolidayStart }],
        "2026-09-02": [{ kind: CalendarEventKind.PaidHoliday }],
      },
    });
    const result = classify({
      start: "2026-08-31T18:00:00",
      end: "2026-09-03T08:00:00",
      meta: days[30].meta,
    });
    expect(result.map(({ point, category }) => ({ point, category }))).toEqual([
      { point: { start: 1080, end: 1440 }, category: "regular" },
      { point: { start: 1440, end: 2520 }, category: "regular" },
      { point: { start: 2520, end: 2880 }, category: "special" },
      { point: { start: 2880, end: 4320 }, category: "special" },
      { point: { start: 4320, end: 4680 }, category: "special" },
      { point: { start: 4680, end: 4800 }, category: "regular" },
    ]);
  });

  it("classifies Friday's special start in a Thursday-to-Friday 24-hour shift", () => {
    const result = classify({
      start: "2026-01-08T18:00:00",
      end: "2026-01-09T18:00:00",
      meta: {
        date: "2026-01-08",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      },
    });
    expect(result.map(({ point, category }) => ({ point, category }))).toEqual([
      { point: { start: 1080, end: 1440 }, category: "regular" },
      { point: { start: 1440, end: 2460 }, category: "regular" },
      { point: { start: 2460, end: 2520 }, category: "special" },
    ]);
  });

  it("resolves each date independently in a multi-day shift", () => {
    const result = classify({
      start: "2026-01-08T18:00:00",
      end: "2026-01-11T08:00:00",
      meta: {
        date: "2026-01-08",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      },
    });
    expect(result.map(({ point, category }) => ({ point, category }))).toEqual([
      { point: { start: 1080, end: 1440 }, category: "regular" },
      { point: { start: 1440, end: 2460 }, category: "regular" },
      { point: { start: 2460, end: 2880 }, category: "special" },
      { point: { start: 2880, end: 4320 }, category: "special" },
      { point: { start: 4320, end: 4680 }, category: "special" },
      { point: { start: 4680, end: 4800 }, category: "regular" },
    ]);
  });

  it("keeps a regular cross-day shift continuous while preserving day identity", () => {
    const result = classify({
      start: "2026-09-21T14:30:00",
      end: "2026-09-22T07:00:00",
      meta: {
        date: "2026-09-21",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      },
    });

    expect(result).toEqual([
      {
        point: { start: 870, end: 1440 },
        category: "regular",
        calendarDate: "2026-09-21",
        dayOffset: 0,
        sourceShiftId: "shift-1",
      },
      {
        point: { start: 1440, end: 1860 },
        category: "regular",
        calendarDate: "2026-09-22",
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

    expect(result.every((interval) => interval.category === "special")).toBe(
      true,
    );
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
