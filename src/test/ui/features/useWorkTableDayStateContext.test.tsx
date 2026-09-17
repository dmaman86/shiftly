import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { WorkDayStatus } from "@/constants";
import type { DateService, Shift } from "@/domain";
import {
  WorkTableDayStateContext,
  useWorkTableDayStateContext,
} from "@/features/work-table/context/workTableDayState/workTableDayStateContext";

const dateServiceStub = {
  createDateWithTime: (dateKey: string) => new Date(`${dateKey}T12:00:00.000Z`),
  addDaysToDate: (date: Date, days: number) => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  },
  formatDate: (date: Date) => date.toISOString().slice(0, 10),
} as unknown as DateService;

const makeShift = (id: string): Shift => ({
  id,
  start: { date: new Date("2026-09-14T22:00:00") },
  end: { date: new Date("2026-09-15T06:00:00") },
  isDuty: false,
});

describe("useWorkTableDayStateContext", () => {
  it("selects shifts from the adjacent days", () => {
    const previousShift = makeShift("previous");
    const nextShift = makeShift("next");
    const state = {
      "2026-09-14": {
        status: WorkDayStatus.normal,
        shiftEntries: {
          [previousShift.id]: { shift: previousShift, payMap: null },
        },
      },
      "2026-09-15": {
        status: WorkDayStatus.normal,
        shiftEntries: {},
      },
      "2026-09-16": {
        status: WorkDayStatus.normal,
        shiftEntries: {
          [nextShift.id]: { shift: nextShift, payMap: null },
        },
      },
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkTableDayStateContext.Provider
        value={{
          state,
          dispatch: vi.fn(),
          hydrated: true,
          setHydrated: vi.fn(),
        }}
      >
        {children}
      </WorkTableDayStateContext.Provider>
    );

    const { result } = renderHook(() => useWorkTableDayStateContext(), { wrapper });

    expect(
      result.current
        .getAdjacentDayShifts("2026-09-15", dateServiceStub)
        .map((shift) => shift.id),
    ).toEqual(["previous", "next"]);
  });
});
