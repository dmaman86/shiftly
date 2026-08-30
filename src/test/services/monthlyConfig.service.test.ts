import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: { from: fromMock },
}));

import { monthlyConfigService } from "@/services/monthlyConfig/monthlyConfig.service";

describe("monthlyConfigService", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("fetches the persisted config for a user/year/month", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        year: 2026,
        month: 8,
        standard_hours: 6.67,
        base_rate: 50,
        unused_shabbat_credit_hours: 3.5,
      },
      error: null,
    });
    const eqMonth = vi.fn().mockReturnValue({ maybeSingle });
    const eqYear = vi.fn().mockReturnValue({ eq: eqMonth });
    const eqUser = vi.fn().mockReturnValue({ eq: eqYear });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    fromMock.mockReturnValue({ select });

    const result = await monthlyConfigService().fetch("user-1", 2026, 8).call();

    expect(fromMock).toHaveBeenCalledWith("monthly_configs");
    expect(select).toHaveBeenCalledWith(
      "year, month, standard_hours, base_rate, unused_shabbat_credit_hours",
    );
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqYear).toHaveBeenCalledWith("year", 2026);
    expect(eqMonth).toHaveBeenCalledWith("month", 8);
    expect(result).toEqual({
      data: {
        year: 2026,
        month: 8,
        standard_hours: 6.67,
        base_rate: 50,
        unused_shabbat_credit_hours: 3.5,
      },
    });
  });

  it("returns null data when no config was ever saved for that month", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }),
    });

    const result = await monthlyConfigService().fetch("user-1", 2026, 8).call();

    expect(result).toEqual({ data: null });
  });

  it("returns an error when the fetch fails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "connection lost" },
    });
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }),
    });

    const result = await monthlyConfigService().fetch("user-1", 2026, 8).call();

    expect(result).toEqual({ error: "connection lost" });
  });

  it("upserts the config scoped to the user with the correct conflict target", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({ upsert });

    const record = { year: 2026, month: 8, standard_hours: 7, base_rate: 55 };
    const result = await monthlyConfigService().upsert("user-1", record).call();

    expect(fromMock).toHaveBeenCalledWith("monthly_configs");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", ...record }),
      { onConflict: "user_id,year,month" },
    );
    expect(result).toEqual({ data: null });
  });

  it("returns an error when the upsert fails", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } });
    fromMock.mockReturnValue({ upsert });

    const result = await monthlyConfigService()
      .upsert("user-1", { year: 2026, month: 8, standard_hours: 7, base_rate: 55 })
      .call();

    expect(result).toEqual({ error: "denied" });
  });

  it("writes the unused Shabbat credit balance without touching other config fields", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({ upsert });

    const result = await monthlyConfigService()
      .setUnusedShabbatCreditHours("user-1", 2026, 8, 3.5)
      .call();

    expect(fromMock).toHaveBeenCalledWith("monthly_configs");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        year: 2026,
        month: 8,
        unused_shabbat_credit_hours: 3.5,
      }),
      { onConflict: "user_id,year,month" },
    );
    expect(result).toEqual({ data: null });
  });
});
