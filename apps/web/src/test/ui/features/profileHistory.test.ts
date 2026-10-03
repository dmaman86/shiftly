import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkDayStatus } from "@shiftly/domain";
import { domain } from "@/app/domain";
import { calculateProfileMonth, getProfileMonths, loadProfileHistory } from "@/features/profile/profileHistory";
import { useGlobalStore } from "@/store/globalStore";

const services = vi.hoisted(() => ({ config: vi.fn(), days: vi.fn(), shifts: vi.fn() }));
vi.mock("@/services", () => ({
  monthlyConfigService: () => ({ fetch: services.config }),
  workDayService: () => ({ fetchForMonth: services.days }),
  shiftService: () => ({ fetchForMonth: services.shifts }),
}));
vi.mock("@/hooks/useWorkDays", () => ({ loadCalendarEventMap: vi.fn() }));

const period = { year: 2026, month: 8 };
const range = { from: { year: 2026, month: 3 }, to: period };
const config = { ...period, standard_hours: 8, base_rate: 40, unused_shabbat_credit_hours: 0 };
const workDays = domain.payMap.workDaysMonthBuilder.build({ ...period, eventMap: {} });

describe("profile history", () => {
  beforeEach(() => {
    services.config.mockReset().mockReturnValue({ call: async () => ({ data: null }) });
    services.days.mockReset().mockReturnValue({ call: async () => ({ data: [] }) });
    services.shifts.mockReset().mockReturnValue({ call: async () => ({ data: [] }) });
  });

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

  it("loads only the signed-in user's bounded months and preceding credit settings", async () => {
    const calendar = vi.fn(async () => workDays);
    const result = await loadProfileHistory("user-1", range, domain, calendar);
    expect(result).toHaveLength(6);
    expect(services.config).toHaveBeenCalledTimes(7);
    expect(services.config).toHaveBeenCalledWith("user-1", 2026, 2);
    expect(services.days).toHaveBeenCalledTimes(6);
    expect(services.shifts).toHaveBeenCalledTimes(6);
    expect(services.days).toHaveBeenCalledWith("user-1", "2026-03-01", "2026-04-01");
    expect(calendar).not.toHaveBeenCalled();
    expect(result.every((month) => month.breakdown === null)).toBe(true);
  });

  it("does not substitute missing defaults when monthly settings fail to load", async () => {
    services.config.mockReturnValueOnce({ call: async () => ({ error: "Settings unavailable" }) });
    await expect(loadProfileHistory("user-1", range, domain)).rejects.toThrow("Settings unavailable");
  });

  it("does not return partial totals when shift loading fails", async () => {
    services.shifts.mockReturnValueOnce({ call: async () => ({ error: "Shifts unavailable" }) });
    await expect(loadProfileHistory("user-1", range, domain)).rejects.toThrow("Shifts unavailable");
  });

  it("loads every month in a twelve-month range with bounded request concurrency", async () => {
    let active = 0;
    let maximum = 0;
    const response = <T,>(data: T) => ({ call: async () => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return { data };
    } });
    services.config.mockImplementation(() => response(null));
    services.days.mockImplementation(() => response([]));
    services.shifts.mockImplementation(() => response([]));
    const result = await loadProfileHistory("user-1", { from: { year: 2025, month: 9 }, to: period }, domain);
    expect(result).toHaveLength(12);
    expect(services.config).toHaveBeenCalledTimes(13);
    expect(services.days).toHaveBeenCalledTimes(12);
    expect(services.shifts).toHaveBeenCalledTimes(12);
    expect(maximum).toBeLessThanOrEqual(6);
  });

  it("uses saved preceding credit across batch boundaries", async () => {
    services.config.mockImplementation((_user: string, year: number, month: number) => ({
      call: async () => ({ data: { ...config, year, month, unused_shabbat_credit_hours: 2 } }),
    }));
    const result = await loadProfileHistory("user-1", range, domain, async (month) => domain.payMap.workDaysMonthBuilder.build({ ...month, eventMap: {} }));
    expect(result).toHaveLength(6);
    expect(result.every((snapshot) => snapshot.breakdown?.appliedShabbatCredit.hours === 2)).toBe(true);
  });

  it("stops scheduling later months after a range request is cancelled", async () => {
    const controller = new AbortController();
    services.days.mockReturnValue({ call: async () => {
      controller.abort();
      return { data: [] };
    } });
    await expect(loadProfileHistory("user-1", range, domain, async () => [], controller.signal)).rejects.toThrow();
    expect(services.config).toHaveBeenCalledTimes(4);
    expect(services.days).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid ranges before issuing persistence requests", async () => {
    await expect(loadProfileHistory("user-1", { from: period, to: range.from }, domain)).rejects.toThrow("reversed");
    expect(services.config).not.toHaveBeenCalled();
    expect(services.days).not.toHaveBeenCalled();
  });
});
