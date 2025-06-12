import { describe, it, expect } from "vitest";
import { breakdownService } from "../breakdown.service";
import { fieldShiftPercent } from "@/constants";
import { segmentsService } from "../segments.service";
import { paySegmentFactory } from "../paySegmentFactory.service";

describe("breakdownService", () => {
  const service = breakdownService(fieldShiftPercent, segmentsService);

  it("should initialize with zeroed segments and baseRate", () => {
    const breakdown = service.initBreakdown({});

    expect(breakdown.totalHours).toBe(0);
    expect(breakdown.baseRate).toBe(0);
    expect(breakdown.regular.hours100.hours).toBe(0);
    expect(breakdown.extra.hours50.hours).toBe(0);
    expect(breakdown.special.shabbat150.hours).toBe(0);
  });

  it("should calculate total pay correctly when baseRate is set", () => {
    const baseRate = 100;
    const breakdown = service.initBreakdown({ baseRate });

    breakdown.regular.hours100 = paySegmentFactory({
      hours: 2,
      percent: 1,
      baseRate,
    });
    breakdown.regular.hours125 = paySegmentFactory({
      hours: 1,
      percent: 1.25,
      baseRate,
    });
    breakdown.extra.hours50 = paySegmentFactory({
      hours: 0.5,
      percent: 0.5,
      baseRate,
    });

    const total = breakdown.getTotalPay();
    // total = 2 * 100 + 1 * 125 + 0.5* 50 = 200 + 125 + 25 = 350
    expect(total).toBeCloseTo(350);
  });

  it("should merge two breakdowns by summing correctly", () => {
    const baseRate = 100;
    const breakdown1 = service.initBreakdown({ baseRate });
    const breakdown2 = service.initBreakdown({ baseRate });

    breakdown1.regular.hours100.hours = 2; // 100% -> * 1.0
    breakdown2.regular.hours100.hours = 3; // 100% -> * 1.0

    breakdown1.totalHours = 2;
    breakdown2.totalHours = 3;

    const merged = service.mergeBreakdowns(
      breakdown1,
      breakdown2,
      service.sumSegments,
    );

    expect(merged.regular.hours100.hours).toBe(5); // 2 + 3
    expect(merged.totalHours).toBe(5);
  });

  it("should update base rate and recalculate totals accordingly", () => {
    const baseRate = 80;
    const breakdown = service.initBreakdown({ baseRate });

    breakdown.regular.hours150 = paySegmentFactory({
      hours: 1,
      percent: 1.5,
      baseRate,
    });

    const totalBefore = breakdown.getTotalPay();
    expect(totalBefore).toBeCloseTo(120); // 1 * 150% * 80

    const updated = service.updateBaseRate(100, breakdown);
    const totalAfter = updated.getTotalPay();

    expect(updated.baseRate).toBe(100);
    expect(totalAfter).toBeCloseTo(150); // 1 * 150% * 100
  });
});
