import { describe, expect, it } from "vitest";

import { WorkDayType } from "@/constants";
import { allocateShabbatCredit, WorkDayInfo } from "@/domain";

const createWorkDay = (
  date: string,
  typeDay = WorkDayType.Regular,
): Pick<WorkDayInfo, "meta"> => ({
  meta: {
    date,
    typeDay,
    crossDayContinuation: false,
  },
});

const createPayMap = (totalHours: number, earnedHours = 0) => ({
  totalHours,
  earnedShabbatCredit: { percent: 1, hours: earnedHours },
});

describe("allocateShabbatCredit", () => {
  it("applies the monthly credit pool chronologically to regular-day deficits", () => {
    const result = allocateShabbatCredit({
      workDays: [
        createWorkDay("2026-08-02"),
        createWorkDay("2026-08-03"),
        createWorkDay("2026-08-08", WorkDayType.SpecialFull),
      ],
      dailyPayMaps: {
        "2026-08-03": createPayMap(5),
        "2026-08-08": createPayMap(10, 10),
      },
      standardHours: 8,
    });

    expect(result).toEqual({
      earnedHours: 10,
      usedHours: 10,
      unusedHours: 0,
      appliedHoursByDate: {
        "2026-08-02": 8,
        "2026-08-03": 2,
      },
    });
  });

  it("does not apply credit to holidays or days already at standard hours", () => {
    const result = allocateShabbatCredit({
      workDays: [
        createWorkDay("2026-08-01", WorkDayType.SpecialFull),
        createWorkDay("2026-08-02"),
      ],
      dailyPayMaps: {
        "2026-08-01": createPayMap(0, 6),
        "2026-08-02": createPayMap(8),
      },
      standardHours: 8,
    });

    expect(result.usedHours).toBe(0);
    expect(result.unusedHours).toBe(6);
    expect(result.appliedHoursByDate).toEqual({});
  });

  it("reports credit left after all eligible deficits are filled", () => {
    const result = allocateShabbatCredit({
      workDays: [
        createWorkDay("2026-08-01", WorkDayType.SpecialFull),
        createWorkDay("2026-08-02"),
      ],
      dailyPayMaps: {
        "2026-08-01": createPayMap(10, 5),
        "2026-08-02": createPayMap(6),
      },
      standardHours: 8,
    });

    expect(result.usedHours).toBe(2);
    expect(result.unusedHours).toBe(3);
    expect(result.appliedHoursByDate).toEqual({ "2026-08-02": 2 });
  });

  it("applies credit to eligible deficits from earlier in the month", () => {
    const result = allocateShabbatCredit({
      workDays: [
        createWorkDay("2026-08-02"),
        createWorkDay("2026-08-08", WorkDayType.SpecialFull),
      ],
      dailyPayMaps: {
        "2026-08-08": createPayMap(8, 8),
      },
      standardHours: 8,
    });

    expect(result.usedHours).toBe(8);
    expect(result.unusedHours).toBe(0);
    expect(result.appliedHoursByDate).toEqual({ "2026-08-02": 8 });
  });

  it("uses the monthly credit pool to fill a partial-Friday deficit", () => {
    const result = allocateShabbatCredit({
      workDays: [
        createWorkDay("2026-08-01", WorkDayType.SpecialFull),
        createWorkDay("2026-08-07", WorkDayType.SpecialPartialStart),
      ],
      dailyPayMaps: {
        "2026-08-01": createPayMap(5, 5),
        "2026-08-07": createPayMap(6, 4),
      },
      standardHours: 8,
    });

    expect(result.earnedHours).toBe(9);
    expect(result.usedHours).toBe(2);
    expect(result.unusedHours).toBe(7);
    expect(result.appliedHoursByDate).toEqual({ "2026-08-07": 2 });
  });
});
