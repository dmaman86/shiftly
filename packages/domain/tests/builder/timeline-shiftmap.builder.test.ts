import { describe, expect, it } from "vitest";
import { DefaultShiftMapBuilder } from "../../src/builder/shiftmap.builder.js";
import { TimelineShiftPayCalculator } from "../../src/calculator/timeline-shift-pay.calculator.js";
import { WorkDayType } from "../../src/constants/index.js";
import { DateService } from "../../src/services/date.service.js";
import { ShiftService } from "../../src/services/shift.service.js";

const dateService = new DateService();
const shiftService = new ShiftService(dateService);
const builder = new DefaultShiftMapBuilder(shiftService, {
  dateService,
  payCalculator: new TimelineShiftPayCalculator(),
});

const meta = (date: string, typeDay = WorkDayType.Regular) => ({
  date,
  typeDay,
  crossDayContinuation: false,
});

describe("DefaultShiftMapBuilder timeline path", () => {
  it("returns a continuous classified timeline for a cross-day shift", () => {
    const result = builder.build({
      shift: {
        id: "cross-day",
        start: { date: new Date("2026-09-25T14:30:00") },
        end: { date: new Date("2026-09-26T07:00:00") },
        isDuty: false,
      },
      meta: meta("2026-09-25"),
      standardHours: 8,
      isFieldDutyShift: false,
    });

    expect(result.timeline.map((interval) => interval.point)).toEqual([
      { start: 870, end: 1440 },
      { start: 1440, end: 1860 },
    ]);
    expect(result.totalHours).toBe(16.5);
  });

  it("does not produce pay for an invalid shift", () => {
    const result = builder.build({
      shift: {
        id: "invalid",
        start: { date: new Date("2026-09-25T14:30:00") },
        end: { date: new Date("2026-09-25T14:00:00") },
        isDuty: false,
      },
      meta: meta("2026-09-25"),
      standardHours: 8,
      isFieldDutyShift: false,
    });

    expect(result.timeline).toEqual([]);
    expect(result.totalHours).toBe(0);
  });
});
