import { describe, expect, it } from "vitest";

import { WorkDayType } from "@/domain/constants";
import { allocateShabbatCredit, DomainWorkDay } from "@/domain";

const createWorkDay = (
  date: string,
  typeDay = WorkDayType.Regular,
): Pick<DomainWorkDay, "meta"> => ({
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
      carriedOverHours: 0,
      earnedHours: 10,
      totalAvailableHours: 10,
      usedHours: 10,
      unusedHours: 0,
      appliedHoursByDate: {
        "2026-08-02": 8,
        "2026-08-03": 2,
      },
      usageByDate: {
        "2026-08-02": {
          totalHours: 8,
          sources: [{ source: "day", date: "2026-08-08", hours: 8 }],
        },
        "2026-08-03": {
          totalHours: 2,
          sources: [{ source: "day", date: "2026-08-08", hours: 2 }],
        },
      },
    });
  });

  it("adds carried-over hours from a previous month to the available pool", () => {
    const result = allocateShabbatCredit({
      workDays: [createWorkDay("2026-08-02")],
      dailyPayMaps: {
        "2026-08-02": createPayMap(5),
      },
      standardHours: 8,
      carriedOverHours: 3.5,
    });

    expect(result.carriedOverHours).toBe(3.5);
    expect(result.earnedHours).toBe(0);
    expect(result.totalAvailableHours).toBe(3.5);
    expect(result.usedHours).toBe(3);
    expect(result.unusedHours).toBe(0.5);
    expect(result.appliedHoursByDate).toEqual({ "2026-08-02": 3 });
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

  it("explains usage using previous-month and day sources", () => {
    const result = allocateShabbatCredit({
      workDays: [
        createWorkDay("2026-08-02"),
        createWorkDay("2026-08-08", WorkDayType.SpecialFull),
      ],
      dailyPayMaps: {
        "2026-08-02": createPayMap(1),
        "2026-08-08": createPayMap(10, 6),
      },
      standardHours: 8,
      carriedOverHours: 2,
    });

    expect(result.usageByDate).toEqual({
      "2026-08-02": {
        totalHours: 7,
        sources: [
          { source: "previous-month", hours: 2 },
          { source: "day", date: "2026-08-08", hours: 5 },
        ],
      },
    });
  });
});
