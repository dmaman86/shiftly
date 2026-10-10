import { describe, expect, it } from "vitest";
import {
  allocateShabbatCredit,
  WorkDayStatus,
  WorkDayType,
} from "@shiftly/domain";
import type { Shift, WorkDayMap } from "@shiftly/domain";

import { domain } from "@/app/domain";
import { dayToPayBreakdownVM, monthToPayBreakdownVM } from "@/adapters";
import type { PayBreakdownViewModel } from "@/app/types";
import { dayToCompactPayBreakdownVM } from "@/features/work-table/mappers/day/dayToCompactPayBreakdownVM";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";
import { computeTotalPay } from "@/utils";

// totalHours is the paid total of a day or month. Each paid hour is either
// worked (actualHours, split into regular/Shabbat tiers), sick, vacation or
// Shabbat credit applied to fill a short day up to the standard hours.
const DEFAULT_STANDARD_HOURS = 6.67;
// Standard hours are configuration, so invariants must hold for a
// non-default threshold too.
const STANDARD_HOURS_CONFIGS = [DEFAULT_STANDARD_HOURS, 8.4];
const PRECISION = 9;

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 8, day, hour, minute);

const shift = (start: Date, end: Date): Shift => ({
  id: crypto.randomUUID(),
  start: { date: start },
  end: { date: end },
  isDuty: false,
});

const workedHours = ({ regular, special }: PayBreakdownViewModel) =>
  regular.hours100.hours +
  regular.hours125.hours +
  regular.hours150.hours +
  special.shabbat150.hours +
  special.shabbat200.hours;

const expectClosedDecomposition = (vm: PayBreakdownViewModel) => {
  expect(workedHours(vm)).toBeCloseTo(vm.actualHours, PRECISION);
  expect(
    vm.actualHours +
      vm.hours100Sick.hours +
      vm.hours100Vacation.hours +
      vm.appliedShabbatCredit.hours,
  ).toBeCloseTo(vm.totalHours, PRECISION);
};

type DayInput = {
  date: string;
  typeDay: WorkDayType;
  shifts?: Shift[];
  status?: WorkDayStatus;
};

// One week chosen to exercise every bucket: a short day filled by credit,
// sick and vacation days, an empty day, a Friday the credit only partly
// covers once it runs out, and the Shabbat shift that earns the credit.
const week: DayInput[] = [
  {
    date: "2026-09-13",
    typeDay: WorkDayType.Regular,
    shifts: [shift(at(13, 8), at(13, 9, 51))],
  },
  {
    date: "2026-09-14",
    typeDay: WorkDayType.Regular,
    status: WorkDayStatus.sick,
  },
  {
    date: "2026-09-15",
    typeDay: WorkDayType.Regular,
    status: WorkDayStatus.vacation,
  },
  { date: "2026-09-16", typeDay: WorkDayType.Regular },
  {
    date: "2026-09-17",
    typeDay: WorkDayType.Regular,
    shifts: [shift(at(17, 7), at(17, 19))],
  },
  {
    date: "2026-09-18",
    typeDay: WorkDayType.SpecialPartialStart,
    shifts: [shift(at(18, 8), at(18, 10))],
  },
  {
    date: "2026-09-19",
    typeDay: WorkDayType.SpecialFull,
    shifts: [shift(at(19, 7), at(19, 19))],
  },
];

const buildWeek = (standardHours: number) => {
  const workDays = week.map(({ date, typeDay }) => ({
    meta: { date, typeDay, crossDayContinuation: false },
  }));
  const dailyPayMaps: Record<string, WorkDayMap> = Object.fromEntries(
    week.map(({ date, typeDay, shifts = [], status }) => [
      date,
      domain.payMap.calculateDayFromShifts({
        meta: { date, typeDay, crossDayContinuation: false },
        month: 9,
        year: 2026,
        standardHours,
        shifts,
        status,
      }).dayPayMap,
    ]),
  );
  const allocation = allocateShabbatCredit({
    workDays,
    dailyPayMaps,
    standardHours,
  });
  const dayVMs = Object.fromEntries(
    Object.entries(dailyPayMaps).map(([date, dayPayMap]) => [
      date,
      dayToPayBreakdownVM(dayPayMap, allocation.appliedHoursByDate[date] ?? 0),
    ]),
  );
  const monthVM = monthToPayBreakdownVM(
    calculateGlobalBreakdown(dailyPayMaps, domain.payMap.monthPayMapCalculator),
    allocation.usedHours,
  );

  return { allocation, dailyPayMaps, dayVMs, monthVM };
};

describe.each(STANDARD_HOURS_CONFIGS)(
  "pay breakdown hour decomposition with %s standard hours",
  (standardHours) => {
    const { allocation, dailyPayMaps, dayVMs, monthVM } =
      buildWeek(standardHours);

    it.each(week.map(({ date }) => date))(
      "every paid hour of %s has exactly one bucket",
      (date) => {
        expectClosedDecomposition(dayVMs[date]);
      },
    );

    it("pays sick and vacation days without worked hours or credit", () => {
      for (const date of ["2026-09-14", "2026-09-15"]) {
        expect(dayVMs[date].actualHours).toBe(0);
        expect(dayVMs[date].appliedShabbatCredit.hours).toBe(0);
        expect(dayVMs[date].totalHours).toBe(standardHours);
      }
    });

    it("never fills a day with credit beyond the standard hours", () => {
      for (const date of Object.keys(allocation.appliedHoursByDate)) {
        expect(dayVMs[date].totalHours).toBeLessThanOrEqual(
          standardHours + 10 ** -PRECISION,
        );
      }
    });

    it.each(week.map(({ date }) => date))(
      "shows the same totals in the table row of %s as in its details",
      (date) => {
        const baseRate = 50;
        const credit = allocation.appliedHoursByDate[date] ?? 0;
        const compact = dayToCompactPayBreakdownVM(
          dailyPayMaps[date],
          baseRate,
          credit,
        );
        const full = dayVMs[date];

        expect(compact.totalHours).toBe(full.totalHours);
        expect(compact.actualHours).toBe(full.actualHours);
        expect(compact.regularHours + compact.extraHours).toBeCloseTo(
          full.regular.hours100.hours +
            full.regular.hours125.hours +
            full.regular.hours150.hours,
          PRECISION,
        );
        expect(compact.dailySalary).toBe(computeTotalPay(full, baseRate));
      },
    );

    it("keeps the month closed and equal to the sum of its days", () => {
      expectClosedDecomposition(monthVM);
      expect(monthVM.appliedShabbatCredit.hours).toBeCloseTo(
        allocation.usedHours,
        PRECISION,
      );
      expect(monthVM.totalHours).toBeCloseTo(
        Object.values(dayVMs).reduce((sum, vm) => sum + vm.totalHours, 0),
        PRECISION,
      );
    });
  },
);

// Mirrors 2025-10-29 in e2e/fixtures/october-2025.result.json: 1.85 worked
// hours topped up with 4.82 credit hours to the default 6.67 standard hours.
describe("Shabbat credit allocation with the default standard hours", () => {
  const { allocation, dayVMs } = buildWeek(DEFAULT_STANDARD_HOURS);

  it("fills a short day up to the standard hours", () => {
    const shortDay = dayVMs["2026-09-13"];

    expect(shortDay.actualHours).toBeCloseTo(1.85, PRECISION);
    expect(shortDay.appliedShabbatCredit.hours).toBeCloseTo(4.82, PRECISION);
    expect(shortDay.totalHours).toBeCloseTo(DEFAULT_STANDARD_HOURS, PRECISION);
  });

  it("only partly covers the last eligible day once the credit runs out", () => {
    const friday = dayVMs["2026-09-18"];

    expect(allocation.unusedHours).toBe(0);
    expect(friday.totalHours).toBeLessThan(DEFAULT_STANDARD_HOURS);
    expect(friday.appliedShabbatCredit.hours).toBeGreaterThan(0);
  });
});
