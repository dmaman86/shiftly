import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

import { CalendarEventKind } from "@shiftly/domain";
import { loadCalendarEventMap } from "@/hooks/useWorkDays";
import { analyticsService } from "@/services";

const holidayPayload = (date: string, title: string) => ({
  data: { items: [{ date, title, category: "holiday", yomtov: true }] },
});

const isStaticCalendarUrl = (url: string) => /calendar\/\d{4}\.json$/.test(url);

describe("loadCalendarEventMap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(analyticsService, "track").mockImplementation(() => undefined);
  });

  it("reads the static calendar without calling Hebcal", async () => {
    const get = vi
      .spyOn(axios, "get")
      .mockResolvedValue(holidayPayload("2026-09-21", "Yom Kippur"));

    const eventMap = await loadCalendarEventMap("2026-09-01", "2026-10-01");

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toMatch(/calendar\/2026\.json$/);
    expect(eventMap["2026-09-21"]).toEqual([
      { kind: CalendarEventKind.PaidHoliday, holidayKey: "yom_kippur" },
    ]);
  });

  it("merges both years when the range crosses into January", async () => {
    const get = vi.spyOn(axios, "get").mockImplementation(async (url: string) =>
      url.endsWith("2025.json")
        ? holidayPayload("2025-12-15", "Some Yom Tov")
        : holidayPayload("2026-01-01", "Another Yom Tov"),
    );

    const eventMap = await loadCalendarEventMap("2025-12-01", "2026-01-01");

    expect(get.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/calendar\/2025\.json$/),
      expect.stringMatching(/calendar\/2026\.json$/),
    ]);
    expect(Object.keys(eventMap).sort()).toEqual(["2025-12-15", "2026-01-01"]);
  });

  it("falls back to Hebcal when the static calendar is unavailable", async () => {
    const get = vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (isStaticCalendarUrl(url)) throw new Error("Not Found");
      return holidayPayload("2041-10-05", "Yom Kippur");
    });

    const eventMap = await loadCalendarEventMap("2041-10-01", "2041-11-01");

    expect(get).toHaveBeenCalledTimes(2);
    expect(new URL(get.mock.calls[1][0]).origin).toBe("https://www.hebcal.com");
    expect(eventMap["2041-10-05"]).toHaveLength(1);
    expect(analyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ error_type: "static_calendar_error" }),
      }),
    );
  });

  it("falls back to Hebcal when the host answers a missing year with HTML", async () => {
    const get = vi.spyOn(axios, "get").mockImplementation(async (url: string) =>
      isStaticCalendarUrl(url)
        ? { data: "<!doctype html><html></html>" }
        : holidayPayload("2041-10-05", "Yom Kippur"),
    );

    const eventMap = await loadCalendarEventMap("2041-10-01", "2041-11-01");

    expect(new URL(get.mock.calls[1][0]).origin).toBe("https://www.hebcal.com");
    expect(eventMap["2041-10-05"]).toHaveLength(1);
    expect(analyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ error_type: "static_calendar_invalid" }),
      }),
    );
  });

  it("throws when both the static calendar and Hebcal fail", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(new Error("Network Error"));

    await expect(loadCalendarEventMap("2026-09-01", "2026-10-01")).rejects.toThrow();
    expect(analyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ error_type: "hebcal_api_error" }),
      }),
    );
  });
});
