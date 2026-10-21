import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CachedPublishedTimelinesReader } from "../../src/reference-data/cached-published-timelines-reader.ts";
import { ReferenceDataPersistenceError } from "../../src/reference-data/ports.ts";
import {
  InvalidPublishedTimelineError,
  parseTimelineKinds,
  type PublishedTimelines,
  type PublishedTimelinesReader,
} from "../../src/reference-data/published-timelines.ts";
import { publishedTimelinesRouter } from "../../src/reference-data/published-timelines-router.ts";
import {
  SupabasePublishedTimelinesReader,
  toPublishedTimelines,
} from "../../src/reference-data/supabase-published-timelines-reader.ts";

const row = (
  kind: string,
  validFrom: string,
  validTo: string | null,
  value: unknown,
) => ({ kind, valid_from: validFrom, valid_to: validTo, value });

const ROWS = [
  row("per_diem.point_rate", "2024-09-01", null, { amount: 36.3 }),
  row("meal_allowance.rates", "2022-10-01", "2024-09-01", {
    small: 13.5,
    large: 19.7,
  }),
  row("per_diem.point_rate", "2022-10-01", "2024-09-01", { amount: 33.9 }),
  row("meal_allowance.rates", "2024-09-01", null, { small: 14.5, large: 21.1 }),
];

const PUBLISHED: PublishedTimelines = {
  "per_diem.point_rate": [
    { validFrom: "2022-10-01", validTo: "2024-09-01", value: { amount: 33.9 } },
    { validFrom: "2024-09-01", validTo: null, value: { amount: 36.3 } },
  ],
  "meal_allowance.rates": [
    {
      validFrom: "2022-10-01",
      validTo: "2024-09-01",
      value: { small: 13.5, large: 19.7 },
    },
    {
      validFrom: "2024-09-01",
      validTo: null,
      value: { small: 14.5, large: 21.1 },
    },
  ],
};

describe("parseTimelineKinds", () => {
  it("accepts distinct published kinds in the order asked", () => {
    expect(
      parseTimelineKinds("meal_allowance.rates,per_diem.point_rate"),
    ).toEqual(["meal_allowance.rates", "per_diem.point_rate"]);
  });

  it.each<[string, unknown]>([
    ["a missing parameter", undefined],
    ["an empty list", ""],
    ["an unknown kind", "per_diem.point_rate,income_tax.credit_point"],
    ["a subject-keyed kind", "calendar.knesset_election"],
    ["a duplicate", "per_diem.point_rate,per_diem.point_rate"],
    ["a trailing comma", "per_diem.point_rate,"],
    ["a repeated parameter", ["per_diem.point_rate", "meal_allowance.rates"]],
  ])("rejects %s", (_, raw) => {
    expect(parseTimelineKinds(raw)).toBeNull();
  });
});

describe("toPublishedTimelines", () => {
  it("maps rows to the public DTO, grouped by kind and ordered by date", () => {
    expect(toPublishedTimelines(ROWS)).toEqual(PUBLISHED);
  });

  it("publishes a kind without active revisions as an empty timeline", () => {
    expect(toPublishedTimelines([])).toEqual({
      "per_diem.point_rate": [],
      "meal_allowance.rates": [],
    });
  });

  it.each<[string, unknown[]]>([
    [
      "a value of the wrong shape",
      [row("per_diem.point_rate", "2024-09-01", null, { rateA: 36.3 })],
    ],
    [
      "a negative rate",
      [row("per_diem.point_rate", "2024-09-01", null, { amount: -1 })],
    ],
    [
      "overlapping values",
      [
        row("per_diem.point_rate", "2022-10-01", "2025-01-01", { amount: 1 }),
        row("per_diem.point_rate", "2024-09-01", null, { amount: 2 }),
      ],
    ],
    [
      "a value starting mid-month",
      [row("meal_allowance.rates", "2024-09-15", null, { small: 1, large: 2 })],
    ],
    [
      "an unknown kind",
      [row("income_tax.credit_point", "2024-01-01", null, { amount: 1 })],
    ],
  ])("refuses to publish %s", (_, rows) => {
    expect(() => toPublishedTimelines(rows)).toThrow(
      InvalidPublishedTimelineError,
    );
  });

  it("keeps a gap: it is reported by the app, never filled here", () => {
    const withGap = toPublishedTimelines([
      row("per_diem.point_rate", "2020-01-01", "2021-01-01", { amount: 1 }),
      row("per_diem.point_rate", "2022-01-01", null, { amount: 2 }),
    ]);

    expect(withGap["per_diem.point_rate"]).toHaveLength(2);
  });
});

describe("SupabasePublishedTimelinesReader", () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  function readerWith(response: Response) {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response.clone());
    const reader = new SupabasePublishedTimelinesReader({
      url: "https://project.supabase.co",
      secretKey: "sb_secret_test",
      fetch,
    });
    const sent = () => {
      const [input, init] = fetch.mock.calls[0];
      return {
        url: new URL(String(input)),
        headers: new Headers(init?.headers),
      };
    };
    return { reader, sent };
  }

  it("reads active revisions without subject, period and value only", async () => {
    const { reader, sent } = readerWith(json(ROWS));

    expect(await reader.timelines()).toEqual(PUBLISHED);

    const { url, headers } = sent();
    expect(url.pathname).toBe("/rest/v1/reference_revisions");
    expect(url.searchParams.get("select")).toBe(
      "kind,valid_from,valid_to,value",
    );
    expect(url.searchParams.get("kind")).toBe(
      "in.(per_diem.point_rate,meal_allowance.rates)",
    );
    expect(url.searchParams.get("status")).toBe("eq.active");
    expect(url.searchParams.get("subject_key")).toBe("is.null");
    expect(headers.get("apikey")).toBe("sb_secret_test");
  });

  it("reports a store error as a persistence error", async () => {
    const { reader } = readerWith(
      json({ code: "42501", message: "permission denied" }, 403),
    );
    await expect(reader.timelines()).rejects.toThrow(
      ReferenceDataPersistenceError,
    );
  });
});

describe("CachedPublishedTimelinesReader", () => {
  function setup() {
    let now = 0;
    const inner = { timelines: vi.fn(async () => PUBLISHED) };
    const cached = new CachedPublishedTimelinesReader(inner, {
      ttlMs: 1000,
      now: () => now,
    });
    return { inner, cached, advance: (ms: number) => (now += ms) };
  }

  it("serves the timelines from memory until they expire", async () => {
    const { inner, cached, advance } = setup();
    await cached.timelines();
    advance(999);
    await cached.timelines();
    expect(inner.timelines).toHaveBeenCalledTimes(1);

    advance(1);
    await cached.timelines();
    expect(inner.timelines).toHaveBeenCalledTimes(2);
  });

  it("shares one read between concurrent misses", async () => {
    const { inner, cached } = setup();
    await Promise.all([cached.timelines(), cached.timelines()]);
    expect(inner.timelines).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed or invalid read", async () => {
    const { inner, cached } = setup();
    inner.timelines.mockRejectedValueOnce(
      new InvalidPublishedTimelineError("overlap"),
    );
    await expect(cached.timelines()).rejects.toThrow("overlap");
    expect(await cached.timelines()).toEqual(PUBLISHED);
    expect(inner.timelines).toHaveBeenCalledTimes(2);
  });
});

describe("GET /reference/timelines", () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
    vi.restoreAllMocks();
  });

  async function start(reader: PublishedTimelinesReader) {
    const app = express();
    app.use("/reference", publishedTimelinesRouter(reader));
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    return (path: string) => fetch(`http://127.0.0.1:${port}${path}`);
  }

  it("publishes the requested timelines without a token, cacheable for five minutes", async () => {
    const request = await start({ timelines: async () => PUBLISHED });
    const response = await request(
      "/reference/timelines?kinds=per_diem.point_rate,meal_allowance.rates",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, stale-while-revalidate=3600",
    );
    expect(await response.json()).toEqual({ timelines: PUBLISHED });
  });

  it("returns only the kinds asked for", async () => {
    const request = await start({ timelines: async () => PUBLISHED });
    const response = await request(
      "/reference/timelines?kinds=meal_allowance.rates",
    );

    expect(await response.json()).toEqual({
      timelines: { "meal_allowance.rates": PUBLISHED["meal_allowance.rates"] },
    });
  });

  it("answers a kind without published values with an empty timeline", async () => {
    const request = await start({
      timelines: async () => ({
        ...PUBLISHED,
        "per_diem.point_rate": [],
      }),
    });
    const response = await request(
      "/reference/timelines?kinds=per_diem.point_rate",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      timelines: { "per_diem.point_rate": [] },
    });
  });

  it.each(["", "?kinds=", "?kinds=income_tax.credit_point"])(
    "rejects %j with 400 before reading",
    async (query) => {
      const reader = { timelines: vi.fn(async () => PUBLISHED) };
      const request = await start(reader);
      const response = await request(`/reference/timelines${query}`);

      expect(response.status).toBe(400);
      expect(
        ((await response.json()) as { error: { code: string } }).error.code,
      ).toBe("invalid_kinds");
      expect(reader.timelines).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "reference_data_invalid",
      new InvalidPublishedTimelineError("per_diem.point_rate overlaps"),
    ],
    ["reference_data_unavailable", new ReferenceDataPersistenceError("down")],
  ])("answers 503 %s without caching", async (code, failure) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const request = await start({
      timelines: async () => {
        throw failure;
      },
    });
    const response = await request(
      "/reference/timelines?kinds=per_diem.point_rate",
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe(code);
  });
});
