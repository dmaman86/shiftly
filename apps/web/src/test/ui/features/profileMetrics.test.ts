import { describe, expect, it } from "vitest";
import { domain } from "@/app/domain";
import i18n from "@/i18n";
import { monthToPayBreakdownVM } from "@/adapters";
import { buildSectionsSalary } from "@/features/salary-summary/helpers/buildSectionsSalary";
import { calculateTotal } from "@/features/salary-summary/helpers/helper";
import { getProfileMetrics } from "@/features/profile/helpers/profileMetrics";
import type { ProfileMonthSnapshot } from "@/features/profile/helpers/profileHistory";

const createSnapshot = (): ProfileMonthSnapshot => {
  const map = domain.payMap.monthPayMapCalculator.createEmpty();
  map.regular.hours100.hours = 80;
  map.regular.hours125.hours = 10;
  map.regular.hours150.hours = 5;
  map.extra.hours20.hours = 20;
  map.extra.hours50.hours = 8;
  map.extra["evening:30"] = { hours: 4, percent: 0.3 };
  map.special.shabbat150.hours = 6;
  map.special.shabbat200.hours = 2;
  map.hours100Sick.hours = 8;
  map.hours100Vacation.hours = 4;
  map.perDiem.points = 3;
  map.mealAllowance.small.points = 2;
  map.mealAllowance.large.points = 1;
  map.totalHours = 107;
  return {
    year: 2026,
    month: 8,
    baseRate: 40,
    usesDefaultConfig: false,
    breakdown: monthToPayBreakdownVM(map, 3),
  };
};

describe("profile metrics", () => {
  const t = i18n.getFixedT("en", "work-table");

  it("does not count addition hours twice as overtime or worked hours", () => {
    const metrics = getProfileMetrics(createSnapshot(), domain, t);
    expect(metrics?.actualHours).toBe(95);
    expect(metrics?.payableHours).toBe(110);
    expect(metrics?.baseHours).toBe(80);
    expect(metrics?.overtimeHours).toBe(15);
  });

  it("reconciles every payment component with the unedited Total Payment", () => {
    const snapshot = createSnapshot();
    const metrics = getProfileMetrics(snapshot, domain, t);
    const vm = snapshot.breakdown!;
    const sections = buildSectionsSalary({
      payVM: vm,
      baseRate: snapshot.baseRate,
      t,
      rateDiem: domain.resolvers.perDiemResolver.calculateRate(snapshot),
      allowanceRate:
        domain.resolvers.mealAllowanceRateResolver.calculateRates(snapshot),
    });
    const totals = sections.map((section) =>
      calculateTotal(
        section.type === "allowance"
          ? section.buildRows(
              section.payVM,
              section.allowanceRate,
              section.rateDiem,
            )
          : section.buildRows(section.payVM, section.baseRate),
      ),
    );
    expect(metrics?.payment).toEqual({
      base: totals[0],
      extras: totals[1],
      allowances: totals[2],
    });
    expect(metrics?.totalPayment).toBeCloseTo(
      totals.reduce((sum, value) => sum + value, 0),
      8,
    );
    expect(metrics?.payment?.base).toBe((80 + 8 + 4 + 3) * 40);
    expect(metrics?.payment?.allowances).toBeGreaterThan(0);
  });

  it("keeps hours available but does not present missing hourly rates as zero payment", () => {
    const snapshot = createSnapshot();
    snapshot.baseRate = 0;
    const metrics = getProfileMetrics(snapshot, domain, t);
    expect(metrics?.actualHours).toBe(95);
    expect(metrics?.payment).toBeNull();
    expect(metrics?.totalPayment).toBeNull();
  });

  it("preserves the no-records state", () => {
    const snapshot = createSnapshot();
    snapshot.breakdown = null;
    expect(getProfileMetrics(snapshot, domain, t)).toBeNull();
  });
});
