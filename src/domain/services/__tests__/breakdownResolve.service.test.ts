import { describe, it, expect } from "vitest";
import { breakdownResolveService } from "../breakdownResolve.service";
import { WorkDayType, WorkDayStatus } from "@/constants";
import { LabeledSegmentRange, Segment } from "@/domain/types/types";

const service = breakdownResolveService();

describe("distributeRegularHours", () => {
  it("should assign correct hours across 100%, 125%, 150%", () => {
    const breakdown = service.distributeRegularHours(10.5, 6.67);

    expect(breakdown.regular.hours100.hours).toBeCloseTo(6.67);
    expect(breakdown.regular.hours125.hours).toBeCloseTo(2);
    expect(breakdown.regular.hours150.hours).toBeCloseTo(1.83, 1);
  });

  it("should assign all to hours100 if totalHours < standardHours", () => {
    const breakdown = service.distributeRegularHours(4.5, 6.67);

    expect(breakdown.regular.hours100.hours).toBeCloseTo(4.5);
    expect(breakdown.regular.hours125.hours).toBe(0);
    expect(breakdown.regular.hours150.hours).toBe(0);
  });
});

describe("buildExtraBySegments", () => {
  it("should assign hours to extra and special keys correctly", () => {
    const breakdown = service.distributeRegularHours(0, 6.67);
    const segments: LabeledSegmentRange[] = [
      { point: { start: 0, end: 60 }, percent: 0.5, key: "hours50" },
      { point: { start: 60, end: 120 }, percent: 2, key: "shabbat200" },
    ];

    service.buildExtraBySegments(segments, breakdown);

    expect(breakdown.extra.hours50.hours).toBeCloseTo(1);
    expect(breakdown.special.shabbat200.hours).toBeCloseTo(1);
    expect(breakdown.extra100Shabbat.hours).toBeCloseTo(1);
  });
});

describe("calculateBreakdownHours", () => {
  it("should calculate totalHours and assign extra segments", () => {
    const point = { start: 1320, end: 1440 + 90 }; // 22:00 - 01:30 next day
    const meta = {
      date: "2025-06-06",
      crossDayContinuation: true,
      typeDay: WorkDayType.SpecialPartialStart,
    };
    const breakdown = service.calculateBreakdownHours(point, meta);

    expect(breakdown.totalHours).toBeCloseTo(3.5);
    expect(
      breakdown.special.shabbat150.hours + breakdown.special.shabbat200.hours,
    ).toBeGreaterThan(0);
  });
});

describe("calculateBreakdown", () => {
  it("should assign only sick hours if status is sick", () => {
    const breakdown = service.calculateBreakdown(
      [],
      {
        date: "2025-06-08",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      },
      6.67,
      WorkDayStatus.sick,
    );

    expect(breakdown.hours100Sick.hours).toBeCloseTo(6.67);
    expect(breakdown.totalHours).toBeCloseTo(6.67);
  });

  it("should process normal segments and calculate breakdown", () => {
    const segments: Segment[] = [
      {
        id: "s1",
        start: { minutes: 360, date: new Date("2025-06-07") },
        end: { minutes: 1320, date: new Date("2025-06-07") },
      }, // 06:00 - 22:00
    ];

    const breakdown = service.calculateBreakdown(
      segments,
      {
        date: "2025-06-08",
        typeDay: WorkDayType.Regular,
        crossDayContinuation: false,
      },
      6.67,
      WorkDayStatus.normal,
    );

    expect(breakdown.totalHours).toBeGreaterThan(0);
    expect(breakdown.regular.hours100.hours).toBeGreaterThan(0);
  });

  it("should assign all hours150 if SpecialFull day", () => {
    const segments: Segment[] = [
      {
        id: "s1",
        start: { minutes: 360, date: new Date("2025-06-07") },
        end: { minutes: 1320, date: new Date("2025-06-07") },
      }, // 06:00 - 22:00
    ];
    const breakdown = service.calculateBreakdown(
      segments,
      {
        date: "2025-06-07",
        typeDay: WorkDayType.SpecialFull,
        crossDayContinuation: false,
      },
      6.67,
      WorkDayStatus.normal,
    );

    expect(breakdown.special.shabbat150.hours).toBeGreaterThan(0);
    expect(breakdown.regular.hours150.hours).toBe(0);
  });
});
