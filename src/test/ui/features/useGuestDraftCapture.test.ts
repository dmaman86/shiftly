import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import { WorkDayStatus } from "@/domain/constants";
import type { ShiftPayMap } from "@/domain";
import type { WorkTableDayState } from "@/features/work-table/context/workTableDayState/workTableDayStateContext";
import { useGuestDraftCapture } from "@/features/work-table/hooks/month/useGuestDraftCapture";

const DRAFT_KEY = "shiftly:guest-draft";

const state: WorkTableDayState = {
  "2026-09-05": {
    status: WorkDayStatus.normal,
    shiftEntries: {
      morning: {
        shift: {
          id: "morning",
          start: { date: new Date("2026-09-05T05:00:00.000Z") },
          end: { date: new Date("2026-09-05T13:00:00.000Z") },
          isDuty: false,
        },
        payMap: null as unknown as ShiftPayMap,
      },
    },
  },
};

const baseParams = {
  state,
  year: 2026,
  month: 9,
  standardHours: 6.67,
  baseRate: 45.5,
};

const readDraft = () => JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");

describe("useGuestDraftCapture", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("mirrors the guest's month into the draft", () => {
    renderHook(() => useGuestDraftCapture({ ...baseParams, enabled: true }));

    expect(readDraft()).toMatchObject({
      version: 1,
      year: 2026,
      month: 9,
      config: { standardHours: 6.67, baseRate: 45.5 },
      days: [],
      shifts: [{ id: "morning", date: "2026-09-05" }],
    });
  });

  it("does not capture for signed-in users", () => {
    renderHook(() => useGuestDraftCapture({ ...baseParams, enabled: false }));

    expect(readDraft()).toBeNull();
  });

  it("clears the draft once the guest empties the month", () => {
    const { rerender } = renderHook(
      (params: WorkTableDayState) =>
        useGuestDraftCapture({ ...baseParams, state: params, enabled: true }),
      { initialProps: state },
    );

    rerender({});

    expect(readDraft()).toBeNull();
  });
});
