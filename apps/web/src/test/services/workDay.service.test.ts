import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/client", () => ({
  apiClient: { request: requestMock },
}));

import { WorkDayStatus } from "@shiftly/domain";
import { workDayService } from "@/services/workDay/workDay.service";

describe("workDayService", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("fetches the signed-in user's marked days of a month from the API", async () => {
    requestMock.mockResolvedValue({
      data: { workDays: [{ date: "2026-08-10", status: "sick" }] },
    });

    const result = await workDayService()
      .fetchForMonth("user-1", 2026, 8)
      .call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/me/months/2026/8/work-days",
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(result).toEqual({ data: [{ date: "2026-08-10", status: "sick" }] });
  });

  it("passes the API error through", async () => {
    requestMock.mockResolvedValue({ error: "data_unavailable" });
    expect(
      await workDayService().fetchForMonth("user-1", 2026, 8).call(),
    ).toEqual({ error: "data_unavailable" });
  });

  it.each([
    [{}],
    [{ workDays: [{ date: "2026-08-10", status: "holiday" }] }],
    [{ workDays: [{ date: 10, status: "sick" }] }],
    [null],
  ])("rejects an unexpected answer %j", async (data) => {
    requestMock.mockResolvedValue({ data });
    expect(
      await workDayService().fetchForMonth("user-1", 2026, 8).call(),
    ).toEqual({ error: "invalid_response" });
  });

  it.each([WorkDayStatus.sick, WorkDayStatus.vacation, WorkDayStatus.normal])(
    "saves %s for a day; the owner only guards the session",
    async (status) => {
      requestMock.mockResolvedValue({ data: null });

      const result = await workDayService()
        .setStatus("user-1", "2026-08-10", status)
        .call();

      expect(requestMock).toHaveBeenCalledWith({
        method: "PUT",
        path: "/me/work-days/2026-08-10",
        body: { status },
        authenticated: true,
        expectedUserId: "user-1",
      });
      expect(result).toEqual({ data: null });
    },
  );
});
