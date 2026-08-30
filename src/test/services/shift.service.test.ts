import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: { from: fromMock },
}));

import { shiftService } from "@/services/shift/shift.service";

describe("shiftService", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("fetches persisted shifts for a date range", async () => {
    const lt = vi.fn().mockResolvedValue({
      data: [
        {
          id: "shift-1",
          date: "2026-08-10",
          start_time: "2026-08-10T08:00:00.000Z",
          end_time: "2026-08-10T16:00:00.000Z",
          is_duty: false,
        },
      ],
      error: null,
    });
    const gte = vi.fn().mockReturnValue({ lt });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ select });

    const result = await shiftService()
      .fetchForMonth("user-1", "2026-08-01", "2026-09-01")
      .call();

    expect(fromMock).toHaveBeenCalledWith("shifts");
    expect(select).toHaveBeenCalledWith("id, date, start_time, end_time, is_duty");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(gte).toHaveBeenCalledWith("date", "2026-08-01");
    expect(lt).toHaveBeenCalledWith("date", "2026-09-01");
    expect(result.data).toHaveLength(1);
  });

  it("upserts a shift keyed by its client-generated id", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({ upsert });

    const shift = {
      id: "shift-1",
      start: { date: new Date("2026-08-10T08:00:00.000Z") },
      end: { date: new Date("2026-08-10T16:00:00.000Z") },
      isDuty: true,
    };

    const result = await shiftService().upsert("user-1", "2026-08-10", shift).call();

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "shift-1",
        user_id: "user-1",
        date: "2026-08-10",
        start_time: shift.start.date.toISOString(),
        end_time: shift.end.date.toISOString(),
        is_duty: true,
      }),
    );
    expect(result).toEqual({ data: null });
  });

  it("removes a shift scoped to the user", async () => {
    const eqId = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqUser = vi.fn().mockReturnValue({ eq: eqId });
    const del = vi.fn().mockReturnValue({ eq: eqUser });
    fromMock.mockReturnValue({ delete: del });

    const result = await shiftService().remove("user-1", "shift-1").call();

    expect(fromMock).toHaveBeenCalledWith("shifts");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "shift-1");
    expect(result).toEqual({ data: null });
  });
});
