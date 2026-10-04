import { describe, expect, it } from "vitest";
import { WorkDayStatus } from "@shiftly/domain";
import { domain } from "@/app/domain";
import { calculateProfileMonth, getProfileMonths } from "@/features/profile/helpers/profileHistory";
import { useGlobalStore } from "@/store/globalStore";

const period = { year: 2026, month: 8 };
const config = { ...period, standard_hours: 8, base_rate: 40, unused_shabbat_credit_hours: 0 };
const workDays = domain.payMap.workDaysMonthBuilder.build({ ...period, eventMap: {} });

describe("profile history calculation", () => {
  it("returns six chronological months across a year boundary", () => {
    expect(getProfileMonths({ from: { year: 2025, month: 9 }, to: { year: 2026, month: 2 } })).toEqual([
      { year: 2025, month: 9 }, { year: 2025, month: 10 },
      { year: 2025, month: 11 }, { year: 2025, month: 12 },
      { year: 2026, month: 1 }, { year: 2026, month: 2 },
    ]);
  });

  it("projects saved settings, absences and carried credit without mutating the editor", () => {
    const storeBefore = useGlobalStore.getState();
    const result = calculateProfileMonth({
      domain, period, config, carriedOverHours: 3, workDays,
      days: [{ date: "2026-08-11", status: WorkDayStatus.sick }],
      shifts: [{ id: "shift-1", date: "2026-08-10", start_time: "2026-08-10T08:00:00+03:00", end_time: "2026-08-10T18:00:00+03:00", is_duty: false }],
    });
    expect(result.baseRate).toBe(40);
    expect(result.breakdown?.actualHours).toBe(10);
    expect(result.breakdown?.totalHours).toBe(21);
    expect(result.breakdown?.regular.hours100.hours).toBe(8);
    expect(result.breakdown?.regular.hours125.hours).toBe(2);
    expect(result.breakdown?.appliedShabbatCredit.hours).toBe(3);
    expect(useGlobalStore.getState()).toBe(storeBefore);
  });

  it("distinguishes no records from a recorded zero-hour day", () => {
    const empty = calculateProfileMonth({ domain, period, config, carriedOverHours: 0, days: [], shifts: [], workDays });
    const recorded = calculateProfileMonth({ domain, period, config, carriedOverHours: 0, days: [{ date: "2026-08-10", status: WorkDayStatus.normal }], shifts: [], workDays });
    expect(empty.breakdown).toBeNull();
    expect(recorded.breakdown?.actualHours).toBe(0);
  });

  it("includes credit-only months and uses defaults only when settings are absent", () => {
    const result = calculateProfileMonth({ domain, period, config: null, carriedOverHours: 2, days: [], shifts: [], workDays });
    expect(result.usesDefaultConfig).toBe(true);
    expect(result.baseRate).toBe(0);
    expect(result.breakdown?.actualHours).toBe(0);
    expect(result.breakdown?.totalHours).toBe(2);
  });

});
