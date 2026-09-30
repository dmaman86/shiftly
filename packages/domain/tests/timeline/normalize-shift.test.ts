import { describe, expect, it } from "vitest";
import { DateService } from "../../src/services/date.service.js";
import { ShiftService } from "../../src/services/shift.service.js";
import { normalizeShiftTimeline } from "../../src/timeline/normalize-shift.js";
import type { Shift } from "../../src/types/data-shapes.js";

const shiftService = new ShiftService(new DateService());

const createShift = (start: string, end: string): Shift => ({
  id: "shift-1",
  start: { date: new Date(start) },
  end: { date: new Date(end) },
  isDuty: false,
});

describe("normalizeShiftTimeline", () => {
  it("keeps a same-day shift on one continuous minute axis", () => {
    const result = normalizeShiftTimeline({
      shift: createShift("2026-09-25T14:30:00", "2026-09-25T18:00:00"),
      shiftService,
    });

    expect(result).toEqual({
      sourceShiftId: "shift-1",
      point: { start: 870, end: 1080 },
    });
  });

  it("does not split a cross-day shift at midnight", () => {
    const result = normalizeShiftTimeline({
      shift: createShift("2026-09-25T14:30:00", "2026-09-26T07:00:00"),
      shiftService,
    });

    expect(result).toEqual({
      sourceShiftId: "shift-1",
      point: { start: 870, end: 1860 },
    });
  });

  it("returns null for an invalid shift", () => {
    const result = normalizeShiftTimeline({
      shift: createShift("2026-09-25T18:00:00", "2026-09-25T17:00:00"),
      shiftService,
    });

    expect(result).toBeNull();
  });
});
