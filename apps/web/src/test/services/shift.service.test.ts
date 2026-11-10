import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/client", () => ({
  apiClient: { request: requestMock },
}));

import { shiftService } from "@/services/shift/shift.service";

describe("shiftService", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("fetches the signed-in user's shifts of a month and maps them to records", async () => {
    requestMock.mockResolvedValue({
      data: {
        shifts: [
          {
            id: "shift-1",
            date: "2026-08-10",
            startTime: "2026-08-10T08:00:00+00:00",
            endTime: "2026-08-10T16:00:00+00:00",
            isDuty: false,
          },
        ],
      },
    });

    const result = await shiftService().fetchForMonth("user-1", 2026, 8).call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/me/months/2026/8/shifts",
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(result).toEqual({
      data: [
        {
          id: "shift-1",
          date: "2026-08-10",
          start_time: "2026-08-10T08:00:00+00:00",
          end_time: "2026-08-10T16:00:00+00:00",
          is_duty: false,
        },
      ],
    });
  });

  it("passes the API error through", async () => {
    requestMock.mockResolvedValue({ error: "unauthenticated" });
    expect(
      await shiftService().fetchForMonth("user-1", 2026, 8).call(),
    ).toEqual({ error: "unauthenticated" });
  });

  it.each([
    [{}],
    [{ shifts: [{ id: "shift-1", date: "2026-08-10" }] }],
    [{ shifts: "none" }],
  ])("rejects an unexpected answer %j", async (data) => {
    requestMock.mockResolvedValue({ data });
    expect(
      await shiftService().fetchForMonth("user-1", 2026, 8).call(),
    ).toEqual({ error: "invalid_response" });
  });

  it("saves a shift under its client-generated id, never with a user id", async () => {
    requestMock.mockResolvedValue({ data: null });

    const shift = {
      id: "shift-1",
      start: { date: new Date("2026-08-10T08:00:00.000Z") },
      end: { date: new Date("2026-08-10T16:00:00.000Z") },
      isDuty: true,
    };

    const result = await shiftService()
      .upsert("user-1", "2026-08-10", shift)
      .call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "PUT",
      path: "/me/shifts/shift-1",
      body: {
        date: "2026-08-10",
        startTime: shift.start.date.toISOString(),
        endTime: shift.end.date.toISOString(),
        isDuty: true,
      },
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(result).toEqual({ data: null });
  });

  it("removes a shift by id", async () => {
    requestMock.mockResolvedValue({ data: null });

    await shiftService().remove("user-1", "shift-1").call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/me/shifts/shift-1",
      authenticated: true,
      expectedUserId: "user-1",
    });
  });
});
