import { beforeEach, describe, expect, it, vi } from "vitest";
import { domain } from "@/app/domain";
import { loadProfileHistory } from "@/features/profile/services/profileHistory.service";

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

describe("profile history loading", () => {
  beforeEach(() => {
    services.config.mockReset().mockReturnValue({ call: async () => ({ data: null }) });
    services.days.mockReset().mockReturnValue({ call: async () => ({ data: [] }) });
    services.shifts.mockReset().mockReturnValue({ call: async () => ({ data: [] }) });
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
