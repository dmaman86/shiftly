import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DomainContextType } from "@/app";
import type { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { useShiftEditor } from "@/features/work-table/hooks/shift/useShiftEditor";

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
        overlaps: (a: Shift, b: Shift) =>
          a.start.date < b.end.date && b.start.date < a.end.date,
      },
    },
  }) as unknown as DomainContextType;

describe("useShiftEditor", () => {
  it("accepts external updates without emitting a write", () => {
    const domain = createDomain({ totalHours: 8 } as ShiftPayMap);
    const onShiftUpdate = vi.fn();
    const { result, rerender } = renderHook(({ shift }) => useShiftEditor({
      domain, shift, meta, standardHours: 6.67, otherShifts: [], onShiftUpdate,
    }), { initialProps: { shift: createShift(16) } });
    const updated = createShift(18);
    rerender({ shift: updated });
    expect(result.current.localShift).toBe(updated);
    expect(onShiftUpdate).not.toHaveBeenCalled();
  });

  it("preserves an invalid draft on refresh but not across shift identities", () => {
    const domain = createDomain({ totalHours: 8 } as ShiftPayMap);
    const { result, rerender } = renderHook(({ shift }) => useShiftEditor({
      domain, shift, meta, standardHours: 6.67, otherShifts: [], onShiftUpdate: vi.fn(),
    }), { initialProps: { shift: createShift(16) } });
    const invalidEnd = new Date("2026-08-10T07:00:00");
    act(() => result.current.handleChange("end", invalidEnd));
    rerender({ shift: createShift(18) });
    expect(result.current.localShift.end.date).toEqual(invalidEnd);
    const other = { ...createShift(19), id: "shift-2" };
    rerender({ shift: other });
    expect(result.current.localShift).toBe(other);
  });
  it("updates calculation immediately for a valid change", () => {
    const payMap = { totalHours: 9 } as ShiftPayMap;
    const domain = createDomain(payMap);
    const onShiftUpdate = vi.fn();
    const { result } = renderHook(() => {
      const [shift, setShift] = useState(() => createShift(16));
      return useShiftEditor({
        domain, shift, meta, standardHours: 6.67, otherShifts: [],
        onShiftUpdate: (nextShift, nextPayMap) => {
          setShift(nextShift);
          onShiftUpdate(nextShift, nextPayMap);
        },
      });
    });
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
        otherShifts: [],
        onShiftUpdate,
      }),
    );
    const invalidEnd = new Date("2026-08-10T07:00:00");

    act(() => result.current.handleChange("end", invalidEnd));

    expect(result.current.localShift.end.date).toEqual(invalidEnd);
    expect(result.current.hasError).toBe(true);
    expect(onShiftUpdate).not.toHaveBeenCalled();
  });

  it("keeps a change that overlaps another shift local instead of committing it", () => {
    const domain = createDomain({ totalHours: 8 } as ShiftPayMap);
    const onShiftUpdate = vi.fn();
    // Sibling shift already covers 12:00-16:00 the same day.
    const sibling: Shift = {
      id: "shift-2",
      start: { date: new Date("2026-08-10T12:00:00") },
      end: { date: new Date("2026-08-10T16:00:00") },
      isDuty: false,
    };
    const { result } = renderHook(() =>
      useShiftEditor({
        domain,
        shift: createShift(16),
        meta,
        standardHours: 6.67,
        otherShifts: [sibling],
        onShiftUpdate,
      }),
    );
    const overlappingEnd = new Date("2026-08-10T14:00:00");

    act(() => result.current.handleChange("end", overlappingEnd));

    expect(result.current.localShift.end.date).toEqual(overlappingEnd);
    expect(result.current.hasOverlap).toBe(true);
    expect(onShiftUpdate).not.toHaveBeenCalled();
  });

  it("allows a change that only touches a sibling shift's boundary", () => {
    const payMap = { totalHours: 8 } as ShiftPayMap;
    const domain = createDomain(payMap);
    const onShiftUpdate = vi.fn();
    // Sibling shift starts right where this shift will end - back-to-back,
    // not overlapping.
    const sibling: Shift = {
      id: "shift-2",
      start: { date: new Date("2026-08-10T16:00:00") },
      end: { date: new Date("2026-08-10T20:00:00") },
      isDuty: false,
    };
    const { result } = renderHook(() =>
      useShiftEditor({
        domain,
        shift: createShift(16),
        meta,
        standardHours: 6.67,
        otherShifts: [sibling],
        onShiftUpdate,
      }),
    );
    const backToBackEnd = new Date("2026-08-10T16:00:00");

    act(() => result.current.handleChange("end", backToBackEnd));

    expect(result.current.hasOverlap).toBe(false);
    expect(onShiftUpdate).toHaveBeenCalled();
  });
});
