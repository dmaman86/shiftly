import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DomainContextType } from "@/app";
import type { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { useShiftEditor } from "@/features/work-table/hooks/useShiftEditor";

const createShift = (endHour: number): Shift => ({
  id: "shift-1",
  start: { date: new Date("2026-08-10T08:00:00") },
  end: { date: new Date(`2026-08-10T${endHour}:00:00`) },
  isDuty: false,
});

const meta: WorkDayMeta = {
  crossDayContinuation: false,
  date: "2026-08-10",
  typeDay: 0,
};

const createDomain = (payMap: ShiftPayMap) =>
  ({
    payMap: {
      shiftMapBuilder: { build: vi.fn(() => payMap) },
    },
    services: {
      dateService: {
        getDaysDifference: (end: Date, start: Date) =>
          Math.floor((end.getTime() - start.getTime()) / 86_400_000),
      },
      shiftService: {
        getMinutesFromMidnight: (date: Date) =>
          date.getHours() * 60 + date.getMinutes(),
        isValidShiftDuration: (shift: Shift) =>
          shift.end.date.getTime() > shift.start.date.getTime(),
        toggleNextDay: vi.fn(),
      },
    },
  }) as unknown as DomainContextType;

describe("useShiftEditor", () => {
  it("updates calculation immediately for a valid change", () => {
    const payMap = { totalHours: 9 } as ShiftPayMap;
    const domain = createDomain(payMap);
    const onShiftUpdate = vi.fn();
    const { result } = renderHook(() =>
      useShiftEditor({
        domain,
        shift: createShift(16),
        meta,
        standardHours: 6.67,
        onShiftUpdate,
      }),
    );
    const nextEnd = new Date("2026-08-10T17:00:00");

    act(() => result.current.handleChange("end", nextEnd));

    expect(result.current.localShift.end.date).toEqual(nextEnd);
    expect(onShiftUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ end: { date: nextEnd } }),
      payMap,
    );
  });

  it("keeps an invalid draft local without updating the calculation", () => {
    const domain = createDomain({ totalHours: 0 } as ShiftPayMap);
    const onShiftUpdate = vi.fn();
    const { result } = renderHook(() =>
      useShiftEditor({
        domain,
        shift: createShift(16),
        meta,
        standardHours: 6.67,
        onShiftUpdate,
      }),
    );
    const invalidEnd = new Date("2026-08-10T07:00:00");

    act(() => result.current.handleChange("end", invalidEnd));

    expect(result.current.localShift.end.date).toEqual(invalidEnd);
    expect(result.current.hasError).toBe(true);
    expect(onShiftUpdate).not.toHaveBeenCalled();
  });
});
