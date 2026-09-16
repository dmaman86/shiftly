import { describe, expect, it } from "vitest";

import { WorkDayType } from "@/constants";
import type { ShiftMapBuilder, WorkDayInfo } from "@/domain";
import type { ShiftRecord } from "@/services/shift/shift.service";
import { recordsToWorkTableDayState } from "@/features/work-table/mappers/recordsToWorkTableDayState";

const shiftMapBuilder = {
  build: () => ({ totalHours: 8 }),
} as unknown as ShiftMapBuilder;

const workDays: WorkDayInfo[] = [
  {
    meta: { date: "2026-09-05", typeDay: WorkDayType.Regular, crossDayContinuation: false },
  },
];

const shiftRecord = (id: string, startTime: string, endTime: string): ShiftRecord => ({
  id,
  date: "2026-09-05",
  start_time: startTime,
  end_time: endTime,
  is_duty: false,
});

describe("recordsToWorkTableDayState", () => {
  it("orders a day's shifts ascending by start time regardless of fetch order", () => {
    const shifts = [
      shiftRecord("afternoon", "2026-09-05T14:00:00.000Z", "2026-09-05T18:00:00.000Z"),
      shiftRecord("morning", "2026-09-05T08:00:00.000Z", "2026-09-05T12:00:00.000Z"),
      shiftRecord("evening", "2026-09-05T20:00:00.000Z", "2026-09-05T23:00:00.000Z"),
    ];

    const state = recordsToWorkTableDayState({
      days: [],
      shifts,
      workDays,
      shiftMapBuilder,
      standardHours: 6.67,
    });

    expect(Object.keys(state["2026-09-05"].shiftEntries)).toEqual([
      "morning",
      "afternoon",
      "evening",
    ]);
  });
});
