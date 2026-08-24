import { describe, expect, it } from "vitest";

import { dayToPayBreakdownVM, monthToPayBreakdownVM } from "@/adapters";
import type { MonthPayMap, WorkDayMap } from "@/domain";

const regular = {
  hours100: { percent: 1, hours: 0 },
  hours125: { percent: 1.25, hours: 0 },
  hours150: { percent: 1.5, hours: 0 },
};

const extra = {
  hours20: { percent: 0.2, hours: 0 },
  hours50: { percent: 0.5, hours: 0 },
};

const special = {
  shabbat150: { percent: 1.5, hours: 0 },
  shabbat200: { percent: 2, hours: 0 },
};

const createDayPayMap = (): WorkDayMap => ({
  workMap: { regular, extra, special, totalHours: 6 },
  hours100Sick: { percent: 1, hours: 0 },
  hours100Vacation: { percent: 1, hours: 0 },
  earnedShabbatCredit: { percent: 1, hours: 8 },
  perDiem: {
    isFieldDutyDay: false,
    diemInfo: { tier: null, points: 0, amount: 0 },
  },
  mealAllowance: {
    small: { points: 0, amount: 0 },
    large: { points: 0, amount: 0 },
  },
  totalHours: 6,
});

const createMonthPayMap = (): MonthPayMap => ({
  regular,
  extra,
  special,
  hours100Sick: { percent: 1, hours: 4 },
  hours100Vacation: { percent: 1, hours: 0 },
  earnedShabbatCredit: { percent: 1, hours: 8 },
  perDiem: { tier: null, points: 0, amount: 0 },
  mealAllowance: {
    small: { points: 0, amount: 0 },
    large: { points: 0, amount: 0 },
  },
  totalHours: 20,
});

describe("pay breakdown mappers", () => {
  it("adds only applied Shabbat credit to the daily total", () => {
    const result = dayToPayBreakdownVM(createDayPayMap(), 2);

    expect(result.totalHours).toBe(8);
    expect(result.actualHours).toBe(6);
    expect(result.appliedShabbatCredit.hours).toBe(2);
  });

  it("excludes unused Shabbat credit from the monthly view model", () => {
    const result = monthToPayBreakdownVM(createMonthPayMap(), 3);

    expect(result.totalHours).toBe(23);
    expect(result.actualHours).toBe(16);
    expect(result.appliedShabbatCredit.hours).toBe(3);
  });
});
