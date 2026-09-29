import { describe, expect, it } from "vitest";

import { WorkDayStatus, WorkDayType } from "@/domain/constants";
import type { ShiftMapBuilder, ShiftPayMap } from "@/domain";
import type { WorkDayInfo } from "@/app/types";
import type { WorkTableDayState } from "@/features/work-table/context/workTableDayState/workTableDayStateContext";
import { recordsToWorkTableDayState } from "@/features/work-table/mappers/month/recordsToWorkTableDayState";
import { workTableStateToRecords } from "@/features/work-table/mappers/month/workTableStateToRecords";

const payMap = { totalHours: 8 } as unknown as ShiftPayMap;

const shiftMapBuilder = {
  build: () => payMap,
} as unknown as ShiftMapBuilder;

const workDays: WorkDayInfo[] = ["2026-09-05", "2026-09-06", "2026-09-07"].map(
  (date) => ({
    meta: { date, typeDay: WorkDayType.Regular, crossDayContinuation: false },
  }),
);

const shiftEntry = (id: string, start: string, end: string, isDuty = false) => ({
  shift: { id, start: { date: new Date(start) }, end: { date: new Date(end) }, isDuty },
  payMap,
});

const state: WorkTableDayState = {
  "2026-09-05": {
    status: WorkDayStatus.normal,
    shiftEntries: {
      morning: shiftEntry("morning", "2026-09-05T05:00:00.000Z", "2026-09-05T13:00:00.000Z"),
      night: shiftEntry("night", "2026-09-05T20:00:00.000Z", "2026-09-06T04:00:00.000Z", true),
    },
  },
  "2026-09-06": { status: WorkDayStatus.vacation, shiftEntries: {} },
  "2026-09-07": { status: WorkDayStatus.normal, shiftEntries: {} },
};

describe("workTableStateToRecords", () => {
  it("stores only non-normal statuses, since row absence means normal", () => {
    const { days } = workTableStateToRecords(state);

    expect(days).toEqual([{ date: "2026-09-06", status: WorkDayStatus.vacation }]);
  });

  it("serializes shifts under their day key with ISO times", () => {
    const { shifts } = workTableStateToRecords(state);

    expect(shifts).toEqual([
      {
        id: "morning",
        date: "2026-09-05",
        start_time: "2026-09-05T05:00:00.000Z",
        end_time: "2026-09-05T13:00:00.000Z",
        is_duty: false,
      },
      {
        id: "night",
        date: "2026-09-05",
        start_time: "2026-09-05T20:00:00.000Z",
        end_time: "2026-09-06T04:00:00.000Z",
        is_duty: true,
      },
    ]);
  });

  it("round-trips through recordsToWorkTableDayState", () => {
    const records = workTableStateToRecords(state);

    const restored = recordsToWorkTableDayState({
      ...records,
      workDays,
      shiftMapBuilder,
      standardHours: 6.67,
    });

    // Empty normal days carry no information, so they are not persisted.
    const meaningfulState = Object.fromEntries(
      Object.entries(state).filter(([date]) => date !== "2026-09-07"),
    );
    expect(restored).toEqual(meaningfulState);
  });

  it("returns no records for an empty month", () => {
    expect(workTableStateToRecords({})).toEqual({ days: [], shifts: [] });
  });
});
