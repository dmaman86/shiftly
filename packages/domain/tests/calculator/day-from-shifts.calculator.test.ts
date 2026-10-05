import { WorkDayStatus, WorkDayType } from "../../src/constants/index.js";
import {
  buildPayMapPipeline,
  calculateDayFromShifts,
  Shift,
} from "../../src/index.js";

const pipeline = buildPayMapPipeline();

const createShift = (
  startHour: number,
  endHour: number,
  isDuty = false,
): Shift => ({
  id: crypto.randomUUID(),
  start: { date: new Date(2026, 8, 6, startHour) },
  end: { date: new Date(2026, 8, 6, endHour) },
  isDuty,
});

describe("calculateDayFromShifts", () => {
  it("pays wall-clock hours on the autumn daylight-saving transition night", () => {
    const startTime = "2025-10-25T22:47:00+03:00";
    const endTime = "2025-10-26T07:01:00+02:00";
    const result = pipeline.payMap.calculateDayFromShifts({
      meta: {
        crossDayContinuation: false,
        date: "2025-10-25",
        typeDay: WorkDayType.SpecialFull,
      },
      month: 10,
      year: 2025,
      standardHours: 6.67,
      shifts: [
        {
          id: "autumn-clock-change",
          start: {
            date: pipeline.services.dateService.createDateFromPersisted(
              startTime,
            ),
          },
          end: {
            date: pipeline.services.dateService.createDateFromPersisted(
              endTime,
            ),
          },
          isDuty: false,
        },
      ],
    });

    expect(result.dayPayMap.totalHours).toBeCloseTo(8.233333333333333, 10);
    expect(result.dayPayMap.workMap.regular.hours150.hours).toBeCloseTo(
      1.0166666666666666,
      10,
    );
    expect(result.dayPayMap.workMap.special.shabbat200.hours).toBeCloseTo(
      7.216666666666667,
      10,
    );
    const elapsedHours =
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000;
    expect(elapsedHours).toBeCloseTo(9.233333333333333, 10);
  });

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
