import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { domain } from "@/app";
import { buildEventMap, dayToPayBreakdownVM, monthToPayBreakdownVM } from "@/adapters";
import { allocateShabbatCredit } from "@shiftly/domain";
import type { WorkDayStatus } from "@shiftly/domain";
import {
  recordsToWorkTableDayState,
  workTableStateToDailyPayMaps,
} from "@/features/work-table/mappers/month";
import type { ShiftRecord } from "@/services/shift/shift.service";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";
import { computeTotalPay, formatValue } from "@/utils";

/**
 * Golden month scenarios shared with the Playwright suite (e2e/fixtures).
 * They run here against the same mapping path the app uses when hydrating a
 * month, so calculation coverage does not depend on a browser.
 */

type MonthFixture = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
  timeZone: string;
  holidays?: unknown[];
  statuses: Array<{ date: string; status: WorkDayStatus }>;
  shifts: ShiftRecord[];
};

type MonthFixtureResult = {
  shabbatCreditAllocation: {
    carriedOverHours: number;
    earnedHours: number;
    totalAvailableHours: number;
    usedHours: number;
    unusedHours: number;
    appliedHoursByDate: Record<string, number>;
  };
  daily: Record<
    string,
    { status: WorkDayStatus; breakdown: Record<string, unknown>; salary: number }
  >;
  monthly: { breakdown: Record<string, unknown>; salary: number };
};

const FIXTURES = [
  { name: "October 2021", file: "october-2021" },
  { name: "March 2022", file: "march-2022" },
  { name: "October 2025", file: "october-2025" },
  { name: "August 2026", file: "august-2026" },
];

const PRECISION = 6;

const loadFixture = <T>(file: string): T =>
  JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../../../../../e2e/fixtures", file), "utf8"),
  ) as T;

const expectCloseTo = (actual: unknown, expected: unknown, path: string) => {
  if (typeof expected === "number") {
    expect(actual, path).toBeTypeOf("number");
    expect(actual as number, path).toBeCloseTo(expected, PRECISION);
    return;
  }
  if (expected !== null && typeof expected === "object") {
    expect(actual, path).toBeTypeOf("object");
    for (const [key, value] of Object.entries(expected)) {
      expectCloseTo((actual as Record<string, unknown>)[key], value, `${path}.${key}`);
    }
    return;
  }
  expect(actual, path).toEqual(expected);
};

// Salaries are currency: compare them at the cent precision the UI displays.
const expectSalary = (actual: number | undefined, expected: number) => {
  expect(formatValue(actual)).toBe(formatValue(expected));
};

const calculateMonth =(input: MonthFixture) => {
  const { year, month, standardHours, baseRate } = input;
  const workDays = domain.payMap.workDaysMonthBuilder.build({
    year,
    month,
    eventMap: buildEventMap({ items: input.holidays ?? [] }),
  });

  const state = recordsToWorkTableDayState({
    days: input.statuses,
    shifts: input.shifts,
    workDays,
    shiftMapBuilder: domain.payMap.shiftMapBuilder,
    standardHours,
  });

  const dailyPayMaps = workTableStateToDailyPayMaps({
    domain,
    state,
    workDays,
    standardHours,
    year,
    month,
  });

  const allocation = allocateShabbatCredit({
    workDays,
    dailyPayMaps,
    standardHours,
    carriedOverHours: 0,
  });

  const daily = Object.fromEntries(
    Object.entries(dailyPayMaps).map(([date, dayPayMap]) => {
      const breakdown = dayToPayBreakdownVM(
        dayPayMap,
        allocation.appliedHoursByDate[date] ?? 0,
      );
      return [
        date,
        {
          status: state[date]?.status,
          breakdown,
          salary: computeTotalPay(breakdown, baseRate),
        },
      ];
    }),
  );

  const monthBreakdown = monthToPayBreakdownVM(
    calculateGlobalBreakdown(dailyPayMaps, domain.payMap.monthPayMapCalculator),
    allocation.usedHours,
  );

  return {
    allocation,
    daily,
    monthly: {
      breakdown: monthBreakdown,
      salary: computeTotalPay(monthBreakdown, baseRate),
    },
  };
};

describe("work table month fixtures", () => {
  describe.each(FIXTURES)("$name", ({ file }) => {
    const input = loadFixture<MonthFixture>(`${file}.json`);
    const expected = loadFixture<MonthFixtureResult>(`${file}.result.json`);
    const actual = calculateMonth(input);

    it("allocates Shabbat credit", () => {
      expectCloseTo(actual.allocation, expected.shabbatCreditAllocation, "allocation");
      expect(Object.keys(actual.allocation.appliedHoursByDate).sort()).toEqual(
        Object.keys(expected.shabbatCreditAllocation.appliedHoursByDate).sort(),
      );
    });

    it("produces the expected worked days", () => {
      expect(Object.keys(actual.daily).sort()).toEqual(
        Object.keys(expected.daily).sort(),
      );
    });

    it.each(Object.keys(expected.daily))("calculates %s", (date) => {
      const { status, breakdown, salary } = expected.daily[date];
      expect(actual.daily[date]?.status).toBe(status);
      expectCloseTo(actual.daily[date]?.breakdown, breakdown, `${date}.breakdown`);
      expectSalary(actual.daily[date]?.salary, salary);
    });

    it("calculates the monthly totals", () => {
      expectCloseTo(actual.monthly.breakdown, expected.monthly.breakdown, "monthly.breakdown");
      expectSalary(actual.monthly.salary, expected.monthly.salary);
    });
  });
});
