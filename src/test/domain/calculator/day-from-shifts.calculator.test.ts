import { WorkDayStatus, WorkDayType } from "@/constants";
import { buildPayMapPipeline, calculateDayFromShifts, Shift } from "@/domain";

const pipeline = buildPayMapPipeline({ timeZone: "Asia/Jerusalem" });

const createShift = (startHour: number, endHour: number, isDuty = false): Shift => ({
  id: crypto.randomUUID(),
  start: { date: new Date(2026, 8, 6, startHour) },
  end: { date: new Date(2026, 8, 6, endHour) },
  isDuty,
});

describe("calculateDayFromShifts", () => {
  it("builds the shift maps and their consolidated day map", () => {
    const shifts = [createShift(8, 12), createShift(13, 17, true)];

    const result = calculateDayFromShifts({
      dayPayMapBuilder: pipeline.payMap.dayPayMapBuilder,
      meta: {
        crossDayContinuation: false,
        date: "2026-09-06",
        typeDay: WorkDayType.Regular,
      },
      month: 9,
      shifts,
      shiftMapBuilder: pipeline.payMap.shiftMapBuilder,
      standardHours: 8,
      status: WorkDayStatus.normal,
      year: 2026,
    });

    expect(result.shiftPayMaps).toHaveLength(2);
    expect(result.dayPayMap.totalHours).toBe(8);
    expect(result.dayPayMap.perDiem.isFieldDutyDay).toBe(true);
  });

  it("calculates each shift independently without changing daily aggregation", () => {
    const firstShift: Shift = {
      id: "first-shift",
      start: { date: new Date(2026, 8, 6, 6, 25) },
      end: { date: new Date(2026, 8, 6, 15, 7) },
      isDuty: false,
    };
    const secondShift: Shift = {
      id: "second-shift",
      start: { date: new Date(2026, 8, 6, 22, 25) },
      end: { date: new Date(2026, 8, 7, 7, 3) },
      isDuty: false,
    };

    const result = calculateDayFromShifts({
      dayPayMapBuilder: pipeline.payMap.dayPayMapBuilder,
      meta: {
        crossDayContinuation: false,
        date: "2026-09-06",
        typeDay: WorkDayType.Regular,
      },
      month: 9,
      shifts: [firstShift, secondShift],
      shiftMapBuilder: pipeline.payMap.shiftMapBuilder,
      standardHours: 6.67,
      year: 2026,
    });

    expect(result.shiftPayMaps[0].regular.hours100.hours).toBeCloseTo(6.67);
    expect(result.shiftPayMaps[0].regular.hours125.hours).toBeCloseTo(2);
    expect(result.shiftPayMaps[0].regular.hours150.hours).toBeCloseTo(0.03);
    expect(result.shiftPayMaps[1].regular.hours100.hours).toBeCloseTo(6.67);
    expect(result.shiftPayMaps[1].regular.hours125.hours).toBeCloseTo(1.96, 2);
    expect(result.shiftPayMaps[1].regular.hours150.hours).toBe(0);

    expect(result.dayPayMap.workMap.regular.hours100.hours).toBeCloseTo(6.67);
    expect(result.dayPayMap.workMap.regular.hours125.hours).toBeCloseTo(2);
    expect(result.dayPayMap.workMap.regular.hours150.hours).toBeCloseTo(
      8.663333,
    );
  });
});
