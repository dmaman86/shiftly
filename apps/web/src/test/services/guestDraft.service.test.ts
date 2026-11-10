import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/client", () => ({
  apiClient: { request: requestMock },
}));

import { WorkDayStatus } from "@shiftly/domain";
import type { GuestDraft } from "@/services/guestDraft";
import { guestDraftService } from "@/services/guestDraft/guestDraft.service";

const draft: GuestDraft = {
  version: 1,
  savedAt: "2026-09-15T07:00:00.000Z",
  year: 2026,
  month: 9,
  config: { standardHours: 6.67, baseRate: 60 },
  days: [{ date: "2026-09-02", status: WorkDayStatus.sick }],
  shifts: [
    {
      id: "draft-shift-1",
      date: "2026-09-05",
      start_time: "2026-09-05T05:00:00.000Z",
      end_time: "2026-09-05T13:00:00.000Z",
      is_duty: true,
    },
  ],
};

describe("guestDraftService", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("imports the month through the API, without shift ids or a user id", async () => {
    requestMock.mockResolvedValue({ data: null });

    const result = await guestDraftService()
      .importMonth("user-1", draft)
      .call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/me/months/2026/9/guest-import",
      body: {
        standardHours: 6.67,
        baseRate: 60,
        days: [{ date: "2026-09-02", status: "sick" }],
        shifts: [
          {
            date: "2026-09-05",
            startTime: "2026-09-05T05:00:00.000Z",
            endTime: "2026-09-05T13:00:00.000Z",
            isDuty: true,
          },
        ],
      },
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(result).toEqual({ data: null });
  });

  it("passes the API error through", async () => {
    requestMock.mockResolvedValue({ error: "session_changed" });
    expect(
      await guestDraftService().importMonth("user-1", draft).call(),
    ).toEqual({ error: "session_changed" });
  });
});
