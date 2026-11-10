import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/client", () => ({
  apiClient: { request: requestMock },
}));

import { monthlyConfigService } from "@/services/monthlyConfig/monthlyConfig.service";

describe("monthlyConfigService", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("fetches the signed-in user's config from the API and maps it to the record", async () => {
    requestMock.mockResolvedValue({
      data: {
        config: {
          standardHours: 6.67,
          baseRate: 50,
          unusedShabbatCreditHours: 3.5,
        },
      },
    });

    const result = await monthlyConfigService().fetch("user-1", 2026, 8).call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/me/months/2026/8/config",
      authenticated: true,
      expectedUserId: "user-1",
    });
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

  it("returns null for a month never saved", async () => {
    requestMock.mockResolvedValue({ data: { config: null } });
    expect(
      await monthlyConfigService().fetch("user-1", 2026, 8).call(),
    ).toEqual({
      data: null,
    });
  });

  it("passes the API error through", async () => {
    requestMock.mockResolvedValue({ error: "data_unavailable" });
    expect(
      await monthlyConfigService().fetch("user-1", 2026, 8).call(),
    ).toEqual({
      error: "data_unavailable",
    });
  });

  it.each([[{}], [{ config: { standardHours: "6.67" } }], [null]])(
    "rejects an unexpected answer %j",
    async (data) => {
      requestMock.mockResolvedValue({ data });
      expect(
        await monthlyConfigService().fetch("user-1", 2026, 8).call(),
      ).toEqual({
        error: "invalid_response",
      });
    },
  );

  it("saves only the typed settings; the owner only guards the session", async () => {
    requestMock.mockResolvedValue({ data: null });

    const result = await monthlyConfigService()
      .upsert("user-1", {
        year: 2026,
        month: 8,
        standard_hours: 6.67,
        base_rate: 60,
      })
      .call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "PUT",
      path: "/me/months/2026/8/config",
      body: { standardHours: 6.67, baseRate: 60 },
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(result).toEqual({ data: null });
  });

  it("saves the Shabbat credit on its own endpoint", async () => {
    requestMock.mockResolvedValue({ data: null });

    await monthlyConfigService()
      .setUnusedShabbatCreditHours("user-1", 2026, 8, 4)
      .call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "PUT",
      path: "/me/months/2026/8/shabbat-credit",
      body: { hours: 4 },
      authenticated: true,
      expectedUserId: "user-1",
    });
  });
});
