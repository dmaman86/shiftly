import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: { from: fromMock },
}));

import { WorkDayStatus } from "@/constants";
import { workDayService } from "@/services/workDay/workDay.service";

describe("workDayService", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("fetches persisted day statuses for a date range", async () => {
    const lt = vi.fn().mockResolvedValue({
      data: [{ date: "2026-08-10", status: "sick" }],
      error: null,
    });
    const gte = vi.fn().mockReturnValue({ lt });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ select });

    const result = await workDayService()
      .fetchForMonth("user-1", "2026-08-01", "2026-09-01")
      .call();

    expect(fromMock).toHaveBeenCalledWith("work_days");
    expect(select).toHaveBeenCalledWith("date, status");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(gte).toHaveBeenCalledWith("date", "2026-08-01");
    expect(lt).toHaveBeenCalledWith("date", "2026-09-01");
    expect(result).toEqual({ data: [{ date: "2026-08-10", status: "sick" }] });
  });

  it("deletes the row when reverting a day to normal", async () => {
    const eqDate = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqUser = vi.fn().mockReturnValue({ eq: eqDate });
    const del = vi.fn().mockReturnValue({ eq: eqUser });
    fromMock.mockReturnValue({ delete: del });

    const result = await workDayService()
      .setStatus("user-1", "2026-08-10", WorkDayStatus.normal)
      .call();

    expect(fromMock).toHaveBeenCalledWith("work_days");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqDate).toHaveBeenCalledWith("date", "2026-08-10");
    expect(result).toEqual({ data: null });
  });

  it("upserts the status when marking a day sick or vacation", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({ upsert });

    const result = await workDayService()
      .setStatus("user-1", "2026-08-10", WorkDayStatus.sick)
      .call();

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        date: "2026-08-10",
        status: WorkDayStatus.sick,
      }),
      { onConflict: "user_id,date" },
    );
    expect(result).toEqual({ data: null });
  });

  it("returns an error when the fetch fails", async () => {
    const lt = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ gte: () => ({ lt }) }) }),
    });

    const result = await workDayService()
      .fetchForMonth("user-1", "2026-08-01", "2026-09-01")
      .call();

    expect(result).toEqual({ error: "boom" });
  });
});
