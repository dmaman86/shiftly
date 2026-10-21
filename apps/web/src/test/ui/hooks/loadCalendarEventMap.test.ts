import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";

import { CalendarEventKind } from "@shiftly/domain";
import { combineElectionData, loadCalendarEventMap } from "@/hooks/useWorkDays";
import { analyticsService } from "@/services";

const API = "https://api.example";
const CACHE_KEY_2026 = "shiftly:published-elections:v1:2026";
const ELECTION_26 = {
  knessetNumber: 26,
  date: "2026-10-27",
  status: "planned",
};
const electionDay = (knessetNumber: number) => [
  { kind: CalendarEventKind.KnessetElectionDay, knessetNumber },
];

const answer = (year: number, elections: unknown[]) => ({
  data: { year, elections },
});
const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");
const httpError = (status: number) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

const remember = (year: number, elections: unknown[], fetchedAt: string) =>
  localStorage.setItem(
    `shiftly:published-elections:v1:${year}`,
    JSON.stringify({ year, elections, fetchedAt }),
  );

describe("loadCalendarEventMap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(analyticsService, "track").mockImplementation(() => undefined);
    vi.stubEnv("VITE_API_URL", API);
  });

  describe("holidays", () => {
    it("are computed without any request for holidays", async () => {
      const get = vi.spyOn(axios, "get").mockResolvedValue(answer(2026, []));

      const { eventMap } = await loadCalendarEventMap(
        "2026-09-01",
        "2026-10-01",
      );

      expect(eventMap["2026-09-21"]).toEqual([
        { kind: CalendarEventKind.PaidHoliday, holidayKey: "yom_kippur" },
      ]);
      expect(get.mock.calls.map(([url]) => url)).toEqual([
        `${API}/reference/elections`,
      ]);
    });

    it("cover years the legacy calendar files never had", async () => {
      vi.spyOn(axios, "get").mockResolvedValue(answer(2041, []));

      const { eventMap } = await loadCalendarEventMap(
        "2041-10-01",
        "2041-11-01",
      );

      expect(eventMap["2041-10-05"]).toEqual([
        { kind: CalendarEventKind.PaidHoliday, holidayKey: "yom_kippur" },
      ]);
    });

    it("stay available when election days are not", async () => {
      vi.spyOn(axios, "get").mockRejectedValue(networkError());

      const { eventMap, electionData } = await loadCalendarEventMap(
        "2026-09-01",
        "2026-10-01",
      );

      expect(eventMap["2026-09-21"]).toHaveLength(1);
      expect(electionData).toEqual({ status: "missing" });
    });
  });

  describe("election days", () => {
    it("come from the API and are remembered as last-known-good", async () => {
      vi.spyOn(axios, "get").mockResolvedValue(answer(2026, [ELECTION_26]));

      const { eventMap, electionData } = await loadCalendarEventMap(
        "2026-10-01",
        "2026-11-01",
      );

      expect(eventMap["2026-10-27"]).toEqual(electionDay(26));
      expect(electionData).toEqual({ status: "fresh" });
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY_2026)!);
      expect(cached).toMatchObject({ year: 2026, elections: [ELECTION_26] });
      expect(Date.parse(cached.fetchedAt)).not.toBeNaN();
    });

    it("trust an empty answer and remember it too", async () => {
      vi.spyOn(axios, "get").mockResolvedValue(answer(2026, []));

      const { eventMap, electionData } = await loadCalendarEventMap(
        "2026-10-01",
        "2026-11-01",
      );

      expect(eventMap["2026-10-27"]).toBeUndefined();
      expect(electionData).toEqual({ status: "fresh" });
      expect(
        JSON.parse(localStorage.getItem(CACHE_KEY_2026)!).elections,
      ).toEqual([]);
    });

    it("fall back to the last answer, reported stale with its date", async () => {
      remember(2026, [ELECTION_26], "2026-10-20T08:00:00.000Z");
      vi.spyOn(axios, "get").mockRejectedValue(networkError());

      const { eventMap, electionData } = await loadCalendarEventMap(
        "2026-10-01",
        "2026-11-01",
      );

      expect(eventMap["2026-10-27"]).toEqual(electionDay(26));
      expect(electionData).toEqual({
        status: "stale",
        fetchedAt: "2026-10-20T08:00:00.000Z",
      });
      expect(analyticsService.track).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ error_type: "elections_stale" }),
        }),
      );
    });

    it("use a remembered empty answer as valid last-known-good data", async () => {
      remember(2025, [], "2026-10-20T08:00:00.000Z");
      vi.spyOn(axios, "get").mockRejectedValue(httpError(503));

      const { electionData } = await loadCalendarEventMap(
        "2025-10-01",
        "2025-11-01",
      );

      expect(electionData).toEqual({
        status: "stale",
        fetchedAt: "2026-10-20T08:00:00.000Z",
      });
    });

    it("are reported missing, never silently empty, without any answer", async () => {
      vi.spyOn(axios, "get").mockRejectedValue(httpError(503));

      const { eventMap, electionData } = await loadCalendarEventMap(
        "2026-10-01",
        "2026-11-01",
      );

      expect(eventMap["2026-10-27"]).toBeUndefined();
      expect(electionData).toEqual({ status: "missing" });
      expect(localStorage.getItem(CACHE_KEY_2026)).toBeNull();
      expect(analyticsService.track).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ error_type: "elections_missing" }),
        }),
      );
    });

    it("ignore a corrupt remembered answer", async () => {
      localStorage.setItem(CACHE_KEY_2026, "{not json");
      vi.spyOn(axios, "get").mockRejectedValue(networkError());

      const { electionData } = await loadCalendarEventMap(
        "2026-10-01",
        "2026-11-01",
      );

      expect(electionData).toEqual({ status: "missing" });
    });

    it("are missing but not tracked when no API is configured", async () => {
      vi.stubEnv("VITE_API_URL", "");
      const get = vi.spyOn(axios, "get");

      const { electionData } = await loadCalendarEventMap(
        "2026-10-01",
        "2026-11-01",
      );

      expect(electionData).toEqual({ status: "missing" });
      expect(get).not.toHaveBeenCalled();
      expect(analyticsService.track).not.toHaveBeenCalled();
    });

    it("fail loudly on a client error instead of hiding it", async () => {
      remember(2026, [ELECTION_26], "2026-10-20T08:00:00.000Z");
      vi.spyOn(axios, "get").mockRejectedValue(httpError(400));

      await expect(
        loadCalendarEventMap("2026-10-01", "2026-11-01"),
      ).rejects.toThrow("Request failed");
    });

    it("are asked for each year a December range touches", async () => {
      remember(2027, [], "2026-10-19T08:00:00.000Z");
      const get = vi
        .spyOn(axios, "get")
        .mockImplementation(async (_url, config) => {
          const year = (config as { params: { year: number } }).params.year;
          if (year === 2027) throw networkError();
          return answer(year, []);
        });

      const { electionData } = await loadCalendarEventMap(
        "2026-12-01",
        "2027-01-01",
      );

      expect(
        get.mock.calls.map(
          ([, config]) => (config as { params: { year: number } }).params.year,
        ),
      ).toEqual([2026, 2027]);
      expect(electionData).toEqual({
        status: "stale",
        fetchedAt: "2026-10-19T08:00:00.000Z",
      });
    });
  });
});

describe("combineElectionData", () => {
  it("lets the least trustworthy state win", () => {
    expect(combineElectionData([{ status: "fresh" }])).toEqual({
      status: "fresh",
    });
    expect(
      combineElectionData([
        { status: "stale", fetchedAt: "2026-10-20T00:00:00.000Z" },
        { status: "stale", fetchedAt: "2026-10-18T00:00:00.000Z" },
        { status: "fresh" },
      ]),
    ).toEqual({ status: "stale", fetchedAt: "2026-10-18T00:00:00.000Z" });
    expect(
      combineElectionData([
        { status: "stale", fetchedAt: "2026-10-20T00:00:00.000Z" },
        { status: "missing" },
      ]),
    ).toEqual({ status: "missing" });
  });
});
