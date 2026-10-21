import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { BASELINE_REFERENCE_TIMELINES } from "@shiftly/domain";
import type { PublishedTimelines } from "@/services";
import {
  fallbackReferences,
  loadReferenceTimelines,
} from "@/services/reference/referenceTimelines";

const API = "https://api.example";
const CACHE_KEY = "shiftly:reference-timelines:v1";
const NOW = () => new Date("2026-10-21T10:00:00.000Z");

const PUBLISHED: PublishedTimelines = {
  "per_diem.point_rate": [
    { validFrom: "2015-11-01", validTo: null, value: { amount: 40 } },
  ],
  "meal_allowance.rates": [
    { validFrom: "2015-11-01", validTo: null, value: { small: 1, large: 2 } },
  ],
};

const answer = (timelines: unknown) => ({ data: { timelines } });
const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");
const timeoutError = () => new AxiosError("timeout", "ECONNABORTED");
const httpError = (status: number) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

const remember = (timelines: unknown, fetchedAt = "2026-10-20T08:00:00.000Z") =>
  localStorage.setItem(CACHE_KEY, JSON.stringify({ timelines, fetchedAt }));

describe("loadReferenceTimelines", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubEnv("VITE_API_URL", API);
  });

  it("asks for every calculation kind in one request", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue(answer(PUBLISHED));

    await loadReferenceTimelines(NOW);

    expect(get).toHaveBeenCalledWith(`${API}/reference/timelines`, {
      params: { kinds: "per_diem.point_rate,meal_allowance.rates" },
      timeout: 5000,
    });
  });

  it("uses a valid answer as fresh and remembers it as last-known-good", async () => {
    vi.spyOn(axios, "get").mockResolvedValue(answer(PUBLISHED));

    const loaded = await loadReferenceTimelines(NOW);

    expect(loaded.source).toEqual({ status: "fresh" });
    expect(
      loaded.resolver.resolve("perDiemPointRate", "2026-10-01"),
    ).toMatchObject({ status: "resolved", value: 40 });
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual({
      timelines: PUBLISHED,
      fetchedAt: "2026-10-21T10:00:00.000Z",
    });
  });

  it("trusts an answer that differs from the baseline, without falling back", async () => {
    vi.spyOn(axios, "get").mockResolvedValue(answer(PUBLISHED));

    const loaded = await loadReferenceTimelines(NOW);

    expect(loaded.timelines).not.toEqual(BASELINE_REFERENCE_TIMELINES);
    expect(loaded.source.status).toBe("fresh");
  });

  it("trusts an empty answer: dates then resolve as not covered, never zero", async () => {
    vi.spyOn(axios, "get").mockResolvedValue(
      answer({ "per_diem.point_rate": [], "meal_allowance.rates": [] }),
    );

    const loaded = await loadReferenceTimelines(NOW);

    expect(loaded.source.status).toBe("fresh");
    expect(loaded.resolver.resolve("perDiemPointRate", "2026-10-01")).toEqual({
      status: "unavailable",
      reason: "not_covered",
    });
  });

  it.each([
    ["a network failure", networkError(), "network"],
    ["a timeout", timeoutError(), "timeout"],
    ["a server error", httpError(503), "http_503"],
  ])("falls back to the last answer after %s", async (_, error, reason) => {
    remember(PUBLISHED);
    vi.spyOn(axios, "get").mockRejectedValue(error);

    const loaded = await loadReferenceTimelines(NOW);

    expect(loaded.source).toEqual({
      status: "stale",
      fetchedAt: "2026-10-20T08:00:00.000Z",
      reason,
    });
    expect(
      loaded.resolver.resolve("perDiemPointRate", "2026-10-01"),
    ).toMatchObject({ value: 40 });
  });

  it("falls back to the embedded baseline without a last answer", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(httpError(503));

    const loaded = await loadReferenceTimelines(NOW);

    expect(loaded.source).toEqual({ status: "baseline", reason: "http_503" });
    expect(loaded.timelines).toBe(BASELINE_REFERENCE_TIMELINES);
  });

  it("uses the baseline when no API is configured", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const get = vi.spyOn(axios, "get");

    const loaded = await loadReferenceTimelines(NOW);

    expect(get).not.toHaveBeenCalled();
    expect(loaded.source).toEqual({
      status: "baseline",
      reason: "not_configured",
    });
  });

  it("surfaces a client error instead of falling back", async () => {
    remember(PUBLISHED);
    vi.spyOn(axios, "get").mockRejectedValue(httpError(400));

    await expect(loadReferenceTimelines(NOW)).rejects.toThrow("Request failed");
  });

  it.each([
    ["a malformed payload", { "per_diem.point_rate": "nope" }],
    [
      "a missing kind",
      { "per_diem.point_rate": PUBLISHED["per_diem.point_rate"] },
    ],
    [
      "a negative rate",
      {
        ...PUBLISHED,
        "per_diem.point_rate": [
          { validFrom: "2015-11-01", validTo: null, value: { amount: -1 } },
        ],
      },
    ],
    [
      "overlapping values the domain rejects",
      {
        ...PUBLISHED,
        "per_diem.point_rate": [
          { validFrom: "2015-11-01", validTo: null, value: { amount: 1 } },
          { validFrom: "2020-01-01", validTo: null, value: { amount: 2 } },
        ],
      },
    ],
  ])(
    "treats %s as an unavailable source, never accepting or repairing it",
    async (_, timelines) => {
      remember(PUBLISHED);
      vi.spyOn(axios, "get").mockResolvedValue(answer(timelines));

      const loaded = await loadReferenceTimelines(NOW);

      expect(loaded.source).toMatchObject({
        status: "stale",
        reason: "invalid_response",
      });
      expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).fetchedAt).toBe(
        "2026-10-20T08:00:00.000Z",
      );
    },
  );

  it("changes the version only when the values change", async () => {
    vi.spyOn(axios, "get").mockResolvedValue(answer(PUBLISHED));
    const first = await loadReferenceTimelines(NOW);
    const again = await loadReferenceTimelines(NOW);

    expect(again.version).toBe(first.version);
    localStorage.clear();
    expect(fallbackReferences("pending").source.status).toBe("baseline");
    expect(first.version).not.toBe(fallbackReferences("pending").version);
  });
});

describe("fallbackReferences", () => {
  beforeEach(() => localStorage.clear());

  it("prefers the last answer over the baseline", () => {
    remember(PUBLISHED);

    expect(fallbackReferences("pending").source).toMatchObject({
      status: "stale",
      reason: "pending",
    });
  });

  it.each([
    ["corrupt JSON", "{not json"],
    ["a wrong shape", JSON.stringify({ timelines: {}, fetchedAt: "x" })],
    [
      "values the domain rejects",
      JSON.stringify({
        timelines: {
          ...PUBLISHED,
          "per_diem.point_rate": [
            { validFrom: "2015-11-15", validTo: null, value: { amount: 1 } },
          ],
        },
        fetchedAt: "2026-10-20T08:00:00.000Z",
      }),
    ],
  ])("ignores a remembered answer with %s", (_, raw) => {
    localStorage.setItem(CACHE_KEY, raw);

    expect(fallbackReferences("pending").source).toEqual({
      status: "baseline",
      reason: "pending",
    });
  });
});
